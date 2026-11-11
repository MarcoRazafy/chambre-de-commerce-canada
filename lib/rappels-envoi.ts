import "server-only";

import { quandEvenement, type EvenementCourriel } from "@/lib/billets";
import { courrielsActifs, envoyerCourriel, urlPublique, type Courriel } from "@/lib/courriel";
import { COORDONNEES } from "@/lib/coordonnees";
import { docDepuisTexte, lireDoc, versHtml, versTexte } from "@/lib/lettre-blocs";
import { prisma } from "@/lib/db";
import { logoPourCourriel } from "@/lib/profil-chambre";
import { toISODate } from "@/lib/enums";
import { pngQr } from "@/lib/qr";
import {
  cleEnvoi,
  debutEvenement,
  estDuA,
  momentsEnvoi,
  prenomDe,
  rappelParDefaut,
  regrouperParAdresse,
  remplir,
  SUJET_DEFAUT,
} from "@/lib/rappels";

type Inscrit = { nom: string; entreprise: string; email: string; code: string | null; statut: string };
type EvenementRappel = EvenementCourriel;
type Rappel = { sujet: string | null; message: string | null };

// Le courriel d'un rappel : le message de l'équipe (variables remplacées), puis les QR codes des inscrits confirmés
export async function courrielRappel(e: EvenementRappel, rappel: Rappel, email: string, participants: Inscrit[]): Promise<Courriel> {
  const premier = participants[0];
  const valeurs = {
    "prénom": prenomDe(premier?.nom ?? ""),
    prenom: prenomDe(premier?.nom ?? ""),
    entreprise: premier?.entreprise ?? "",
    "événement": e.titre,
    evenement: e.titre,
    date: quandEvenement(e),
    lieu: e.lieu,
  };
  const sujet = remplir(rappel.sujet || SUJET_DEFAUT, valeurs).slice(0, 200);
  const avecCode = participants.filter((p) => p.statut === "confirme" && p.code);
  const pieces = await Promise.all(
    avecCode.map(async (p) => ({ nom: `billet-${p.code}.png`, contenu: await pngQr(p.code!), type: "image/png", cid: `qr-${p.code}` })),
  );
  // Le message : la lettre composée dans l'éditeur, un ancien texte simple, ou le rappel par défaut
  const reseaux = { facebook: COORDONNEES.reseaux.facebook, linkedin: COORDONNEES.reseaux.linkedin };
  const doc =
    (rappel.message && lireDoc(rappel.message, reseaux)) ||
    (rappel.message ? docDepuisTexte(e.titre, rappel.message, reseaux) : rappelParDefaut(reseaux));
  const echapper = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const codes = avecCode.length
    ? `<tr><td style="padding:8px 32px 20px;font-size:15px;line-height:1.6;color:#5b6b7a">${avecCode.length > 1 ? "Les QR codes d’entrée, un par participant :" : "Votre QR code d’entrée, à présenter à l’accueil :"}${avecCode
        .map((p) => `<div style="margin:14px 0 0"><div style="font-weight:bold;color:#16202b;margin:0 0 6px">${echapper(`${p.nom ? `${p.nom} · ` : ""}${p.code}`)}</div><img src="cid:qr-${echapper(p.code!)}" width="170" height="170" alt="QR code ${echapper(p.code!)}" style="display:block;border:1px solid #e5eaf0;border-radius:10px;width:170px;height:170px"></div>`)
        .join("")}</td></tr>`
    : "";
  const o = {
    base: (await urlPublique("/")).replace(/\/$/, ""),
    vars: valeurs,
    mention: "Vous recevez ce rappel car vous êtes inscrit(e) à cet événement. Pour toute question, répondez à ce message.",
    desabonnement: null,
    coordonnees: { adresse: COORDONNEES.adresse, email: COORDONNEES.email, telephone: COORDONNEES.telephone, confidentialite: COORDONNEES.legal.confidentialite },
    apres: codes,
    logo: await logoPourCourriel(),
  };
  return { a: email, sujet, pieces, html: versHtml(doc, o), texte: versTexte(doc, o) };
}

const evenementRappel = { id: true, titre: true, date: true, debut: true, fin: true, lieu: true } as const;

// Envoie les rappels dont l'heure est venue ; chaque adresse ne reçoit chaque rappel qu'une fois,
// même si deux serveurs passent en même temps (la ligne « envoyé » est réservée avant l'envoi)
export async function envoyerRappelsDus(maintenant = Date.now()): Promise<{ envoyes: number; echecs: number }> {
  if (!courrielsActifs()) return { envoyes: 0, echecs: 0 };
  const jour = (decalage: number) => new Date(`${new Date(maintenant + decalage * 86_400_000).toISOString().slice(0, 10)}T00:00:00Z`);
  const rappels = await prisma.rappelEvenement.findMany({
    where: { event: { date: { gte: jour(-1), lte: jour(91) } } },
    select: { id: true, avant: true, dates: true, sujet: true, message: true, event: { select: evenementRappel } },
  });

  let envoyes = 0, echecs = 0;
  for (const r of rappels) {
    const e = r.event;
    const debut = debutEvenement(toISODate(e.date), e.debut);
    const dus = momentsEnvoi(r, debut).filter((m) => estDuA(m, debut, maintenant));
    if (!dus.length) continue;
    const inscrits = await prisma.attendee.findMany({
      where: { eventId: e.id, statut: { in: ["confirme", "a_valider"] } },
      orderBy: [{ createdAt: "asc" }, { code: "asc" }],
      select: { nom: true, entreprise: true, email: true, code: true, statut: true },
    });
    for (const moment of dus) {
      const type = cleEnvoi(r.id, moment);
      for (const g of regrouperParAdresse(inscrits)) {
        const reserve = await prisma.rappelEnvoye.createMany({ data: [{ eventId: e.id, type, email: g.email }], skipDuplicates: true });
        if (!reserve.count) continue;
        if (await envoyerCourriel(await courrielRappel(e, r, g.email, g.participants))) {
          envoyes++;
        } else {
          // Raté : la réservation est levée, le prochain passage réessaiera (tant que la date est due)
          await prisma.rappelEnvoye.deleteMany({ where: { eventId: e.id, type, email: g.email } });
          echecs++;
        }
      }
    }
  }
  if (envoyes || echecs) console.info(`[rappels] ${envoyes} rappel(s) envoyé(s), ${echecs} échec(s)`);
  return { envoyes, echecs };
}

// Test : le rappel tel qu'il partira, envoyé à un membre de l'équipe avec un participant d'exemple
export async function envoyerTestRappel(rappelId: string, a: { email: string; nom: string }) {
  const r = await prisma.rappelEvenement.findUnique({
    where: { id: rappelId },
    select: { titre: true, avant: true, sujet: true, message: true, event: { select: evenementRappel } },
  });
  if (!r) return false;
  const c = await courrielRappel(r.event, r, a.email, [{ nom: a.nom, entreprise: "Votre entreprise", email: a.email, code: null, statut: "a_valider" }]);
  return envoyerCourriel({ ...c, sujet: `[Test · ${r.titre || "Rappel"}] ${c.sujet}` });
}
