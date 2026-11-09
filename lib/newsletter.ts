import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { courrielsActifs, enTete, envoyerCourriel, envoyerCourrielSuivi, gabarit, urlPublique } from "@/lib/courriel";
import { COORDONNEES } from "@/lib/coordonnees";
import { lireDoc, versHtml, versTexte } from "@/lib/lettre-blocs";

// Audience d'une lettre : les contacts des membres (selon le statut et les tags de l'entreprise, principal ou tous)
// et, si coché, les abonnés à la lettre d'information. Avec « evenement », seulement les inscrits de cet événement.
export type Audience = {
  statuts: ("a_jour" | "en_attente" | "en_retard")[];
  etiquettes: string[];
  contacts: "principal" | "tous";
  abonnes: boolean;
  evenement?: string;
};
export const AUDIENCE_DEFAUT: Audience = { statuts: ["a_jour", "en_attente", "en_retard"], etiquettes: [], contacts: "tous", abonnes: true };
export const STATUTS_AUDIENCE: [Audience["statuts"][number], string][] = [
  ["a_jour", "À jour"],
  ["en_attente", "En attente de paiement"],
  ["en_retard", "En retard"],
];

export function lireAudience(v: unknown): Audience {
  const o = (v && typeof v === "object" ? v : {}) as Partial<Audience>;
  const statuts = (Array.isArray(o.statuts) ? o.statuts : []).filter((s): s is Audience["statuts"][number] => STATUTS_AUDIENCE.some(([k]) => k === s));
  return {
    statuts,
    etiquettes: Array.isArray(o.etiquettes) ? o.etiquettes.map(String).filter(Boolean) : [],
    contacts: o.contacts === "principal" ? "principal" : "tous",
    abonnes: o.abonnes === true,
    ...(typeof o.evenement === "string" && o.evenement ? { evenement: o.evenement.slice(0, 40) } : {}),
  };
}

// « motif » : pourquoi la personne reçoit ce courriel, rappelé en bas (sinon : membre ou abonné)
export type Destinataire = { email: string; nom: string; abonne: boolean; motif?: string; entreprise?: string };

// Une adresse n'apparaît qu'une fois, même si elle est à la fois contact et abonnée
export async function destinataires(a: Audience): Promise<Destinataire[]> {
  const parAdresse = new Map<string, Destinataire>();
  if (a.evenement) {
    // Les inscrits de l'événement (pas ceux notés absents), un courriel par adresse
    const e = await prisma.event.findUnique({ where: { id: a.evenement }, select: { titre: true } });
    if (!e) return [];
    const inscrits = await prisma.attendee.findMany({
      where: { eventId: a.evenement, statut: { not: "absent" } },
      orderBy: { createdAt: "asc" },
      select: { email: true, nom: true },
    });
    for (const p of inscrits) {
      const cle = p.email.trim().toLowerCase();
      if (cle && !parAdresse.has(cle)) {
        parAdresse.set(cle, { email: p.email.trim(), nom: p.nom, abonne: false, motif: `Vous recevez ce message car vous êtes inscrit(e) à « ${e.titre} ».` });
      }
    }
    return [...parAdresse.values()];
  }
  if (a.statuts.length) {
    const contacts = await prisma.user.findMany({
      where: {
        role: "membre",
        ...(a.contacts === "principal" ? { contactPrincipal: true } : {}),
        member: {
          statut: { in: a.statuts },
          ...(a.etiquettes.length ? { etiquettes: { hasSome: a.etiquettes } } : {}),
        },
      },
      select: { email: true, nom: true, member: { select: { nom: true } } },
    });
    for (const c of contacts) parAdresse.set(c.email.toLowerCase(), { email: c.email, nom: c.nom, abonne: false, entreprise: c.member?.nom });
  }
  if (a.abonnes) {
    const abonnes = await prisma.abonne.findMany({ where: { desabonneLe: null, erreurLe: null }, select: { email: true, prenom: true } });
    for (const x of abonnes) if (!parAdresse.has(x.email.toLowerCase())) parAdresse.set(x.email.toLowerCase(), { email: x.email, nom: x.prenom, abonne: true });
  }
  return [...parAdresse.values()];
}

// Lien de désabonnement signé (abonnés à la lettre seulement)
function signature(email: string) {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "cancham").update(`desabonnement:${email.toLowerCase()}`).digest("base64url").slice(0, 32);
}
export function signatureValide(email: string, s: string) {
  const attendu = Buffer.from(signature(email)), recu = Buffer.from(s);
  return attendu.length === recu.length && timingSafeEqual(attendu, recu);
}

async function courrielLettre(sujet: string, contenu: string, d: Destinataire) {
  const desabonnement = d.abonne
    ? await urlPublique(`/desabonnement?${new URLSearchParams({ e: d.email, s: signature(d.email) })}`)
    : null;
  const mention = desabonnement
    ? `Vous recevez cette lettre car vous êtes abonné(e) à la lettre d’information. Pour ne plus la recevoir : ${desabonnement}`
    : (d.motif ?? "Vous recevez ce message en tant que membre de la Chambre.");
  // Lettre composée dans l'éditeur visuel : blocs, variables personnalisées
  const doc = lireDoc(contenu);
  if (doc) {
    const vars = { prenom: d.nom.split(/\s+/)[0] ?? "", nom: d.nom, email: d.email, entreprise: d.entreprise ?? "" };
    const pied = [mention, `Chambre de Commerce et de Coopération Canada–Madagascar · ${COORDONNEES.email} · ${COORDONNEES.telephone}`];
    const base = (await urlPublique("/")).replace(/\/$/, "");
    return { a: d.email, sujet, html: versHtml(doc, { base, logo: enTete(), vars, pied }), texte: versTexte(doc, vars, pied) };
  }
  return {
    a: d.email,
    sujet,
    ...gabarit({
      titre: sujet,
      paragraphes: contenu.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
      apres: desabonnement
        ? [`Vous recevez cette lettre car vous êtes abonné(e) à la lettre d’information de la CanCham. Pour ne plus la recevoir : ${desabonnement}`]
        : [d.motif ?? "Vous recevez ce message en tant que membre de la CanCham."],
    }),
  };
}

// Envoi à toute l'audience : chaque courriel est noté avant de partir, et son identifiant revient dans
// les webhooks du fournisseur (remise, ouverture, clic, rebond) ; renvoie le nombre de courriels partis
export async function envoyerLettre(lettreId: string, sujet: string, contenu: string, liste: Destinataire[]) {
  let partis = 0;
  for (const d of liste) {
    const envoi = await prisma.envoiLettre.create({ data: { lettreId, email: d.email.toLowerCase() } });
    const id = await envoyerCourrielSuivi(await courrielLettre(sujet, contenu, d), { suivi: envoi.id });
    if (id === null) {
      await prisma.envoiLettre.delete({ where: { id: envoi.id } });
      continue;
    }
    partis++;
    if (id) await prisma.envoiLettre.update({ where: { id: envoi.id }, data: { resendId: id } });
  }
  return partis;
}

// Lettres programmées dont l'heure est venue (appelé toutes les 5 minutes, comme les rappels d'événements).
// La lettre est d'abord passée « en cours d'envoi » : deux passages simultanés ne l'envoient pas deux fois.
// Les destinataires sont lus au moment de l'envoi : un désabonnement entre-temps est respecté.
export async function envoyerLettresDues(maintenant = new Date()): Promise<number> {
  if (!courrielsActifs()) return 0;
  const dues = await prisma.lettre.findMany({
    where: { statut: "programmee", programmeeLe: { lte: maintenant } },
    select: { id: true, sujet: true, contenu: true, audience: true, auteur: true },
  });
  let lettres = 0;
  for (const l of dues) {
    const { count } = await prisma.lettre.updateMany({ where: { id: l.id, statut: "programmee" }, data: { statut: "envoi" } });
    if (!count) continue;
    const liste = await destinataires(lireAudience(l.audience));
    const partis = await envoyerLettre(l.id, l.sujet, l.contenu, liste);
    await prisma.lettre.update({
      where: { id: l.id },
      data: { statut: "envoyee", envoyeeLe: new Date(), destinataires: liste.length, envoyes: partis },
    });
    await prisma.auditLog.create({
      data: { action: "lettre_envoyee", entite: "Lettre", entiteId: l.id, acteur: l.auteur, detail: `« ${l.sujet} » (envoi programmé) · ${partis} sur ${liste.length} destinataires.` },
    });
    lettres++;
  }
  return lettres;
}

export async function envoyerTest(sujet: string, contenu: string, email: string, nom: string) {
  return envoyerCourriel(await courrielLettre(`[Test] ${sujet}`, contenu, { email, nom, abonne: false }));
}
