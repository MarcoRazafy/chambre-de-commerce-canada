import "server-only";

import { quandEvenement, type EvenementCourriel } from "@/lib/billets";
import { courrielsActifs, envoyerCourriel, gabarit, type Courriel } from "@/lib/courriel";
import { prisma } from "@/lib/db";
import { toISODate } from "@/lib/enums";
import { pngQr } from "@/lib/qr";
import {
  debutEvenement,
  estDu,
  MESSAGE_DEFAUT,
  prenomDe,
  RAPPELS,
  regrouperParAdresse,
  remplir,
  SUJET_DEFAUT,
  type TypeRappel,
} from "@/lib/rappels";

type Inscrit = { nom: string; entreprise: string; email: string; code: string | null; statut: string };
type EvenementRappel = EvenementCourriel & { rappelSujet: string | null; rappelMessage: string | null };

// Le courriel d'un rappel : le message de l'équipe (variables remplacées), puis les QR codes des inscrits confirmés
export async function courrielRappel(e: EvenementRappel, email: string, participants: Inscrit[]): Promise<Courriel> {
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
  const sujet = remplir(e.rappelSujet || SUJET_DEFAUT, valeurs).slice(0, 200);
  const paragraphes = remplir(e.rappelMessage || MESSAGE_DEFAUT, valeurs)
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const avecCode = participants.filter((p) => p.statut === "confirme" && p.code);
  const pieces = await Promise.all(
    avecCode.map(async (p) => ({ nom: `billet-${p.code}.png`, contenu: await pngQr(p.code!), type: "image/png", cid: `qr-${p.code}` })),
  );
  return {
    a: email,
    sujet,
    pieces,
    ...gabarit({
      titre: e.titre,
      paragraphes: avecCode.length
        ? [...paragraphes, avecCode.length > 1 ? "Les QR codes d’entrée, un par participant :" : "Votre QR code d’entrée, à présenter à l’accueil :"]
        : paragraphes,
      images: avecCode.map((p) => ({ cid: `qr-${p.code}`, legende: `${p.nom ? `${p.nom} — ` : ""}${p.code}` })),
      apres: ["Vous recevez ce rappel car vous êtes inscrit(e) à cet événement. Pour toute question, répondez simplement à ce message."],
    }),
  };
}

const evenementRappel = {
  id: true, titre: true, date: true, debut: true, fin: true, lieu: true,
  rappelJ7: true, rappelJ1: true, rappelH2: true, rappelSujet: true, rappelMessage: true,
} as const;

// Envoie les rappels dont l'heure est venue ; chaque adresse ne reçoit chaque rappel qu'une fois,
// même si deux serveurs passent en même temps (la ligne « envoyé » est réservée avant l'envoi)
export async function envoyerRappelsDus(maintenant = Date.now()): Promise<{ envoyes: number; echecs: number }> {
  if (!courrielsActifs()) return { envoyes: 0, echecs: 0 };
  const jour = (decalage: number) => new Date(`${new Date(maintenant + decalage * 86_400_000).toISOString().slice(0, 10)}T00:00:00Z`);
  const events = await prisma.event.findMany({
    where: {
      date: { gte: jour(-1), lte: jour(9) },
      OR: [{ rappelJ7: true }, { rappelJ1: true }, { rappelH2: true }],
    },
    select: evenementRappel,
  });

  let envoyes = 0, echecs = 0;
  for (const e of events) {
    const debut = debutEvenement(toISODate(e.date), e.debut);
    const dus = RAPPELS.filter((r) => e[r.champ] && estDu(r.cle, debut, maintenant)).map((r) => r.cle);
    if (!dus.length) continue;
    const inscrits = await prisma.attendee.findMany({
      where: { eventId: e.id, statut: { in: ["confirme", "a_valider"] } },
      orderBy: [{ createdAt: "asc" }, { code: "asc" }],
      select: { nom: true, entreprise: true, email: true, code: true, statut: true },
    });
    for (const type of dus) {
      for (const g of regrouperParAdresse(inscrits)) {
        const reserve = await prisma.rappelEnvoye.createMany({ data: [{ eventId: e.id, type, email: g.email }], skipDuplicates: true });
        if (!reserve.count) continue;
        if (await envoyerCourriel(await courrielRappel(e, g.email, g.participants))) {
          envoyes++;
        } else {
          // Raté : la réservation est levée, le prochain passage réessaiera (tant que le rappel est dû)
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
export async function envoyerTestRappel(eventId: string, a: { email: string; nom: string }, type: TypeRappel = "j1") {
  const e = await prisma.event.findUnique({ where: { id: eventId }, select: evenementRappel });
  if (!e) return false;
  const c = await courrielRappel(e, a.email, [{ nom: a.nom, entreprise: "Votre entreprise", email: a.email, code: null, statut: "a_valider" }]);
  return envoyerCourriel({ ...c, sujet: `[Test · ${RAPPELS.find((r) => r.cle === type)!.libelle}] ${c.sujet}` });
}
