import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { annulerCourrielProgramme, envoyerCourriel, envoyerCourrielSuivi, gabarit, urlPublique } from "@/lib/courriel";

// Audience d'une lettre : les contacts des membres (selon leur statut, leurs étiquettes, principal ou tous)
// et, si coché, les abonnés à la lettre d'information.
export type Audience = {
  statuts: ("a_jour" | "en_attente" | "en_retard")[];
  etiquettes: string[];
  contacts: "principal" | "tous";
  abonnes: boolean;
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
  };
}

export type Destinataire = { email: string; nom: string; abonne: boolean };

// Une adresse n'apparaît qu'une fois, même si elle est à la fois contact et abonnée
export async function destinataires(a: Audience): Promise<Destinataire[]> {
  const parAdresse = new Map<string, Destinataire>();
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
      select: { email: true, nom: true },
    });
    for (const c of contacts) parAdresse.set(c.email.toLowerCase(), { email: c.email, nom: c.nom, abonne: false });
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
  return {
    a: d.email,
    sujet,
    ...gabarit({
      titre: sujet,
      paragraphes: contenu.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
      apres: desabonnement
        ? [`Vous recevez cette lettre car vous êtes abonné(e) à la lettre d’information de la CanCham. Pour ne plus la recevoir : ${desabonnement}`]
        : ["Vous recevez ce message en tant que membre de la CanCham."],
    }),
  };
}

// Envoi (ou programmation) à toute l'audience : chaque courriel parti est noté pour suivre
// sa remise, son ouverture et ses clics ; renvoie le nombre de courriels partis
export async function envoyerLettre(
  lettreId: string,
  sujet: string,
  contenu: string,
  liste: Destinataire[],
  programmeLe?: Date,
) {
  let partis = 0;
  for (const d of liste) {
    const id = await envoyerCourrielSuivi(await courrielLettre(sujet, contenu, d), { programmeLe });
    if (id === null) continue;
    partis++;
    await prisma.envoiLettre.create({ data: { lettreId, email: d.email.toLowerCase(), resendId: id || null } });
  }
  return partis;
}

// Annule les courriels encore en attente chez Resend ; renvoie ceux qui n'ont pas pu l'être
export async function annulerEnvois(envois: { id: string; resendId: string | null }[]) {
  let restants = 0;
  for (const e of envois) {
    if (!e.resendId || (await annulerCourrielProgramme(e.resendId))) {
      await prisma.envoiLettre.delete({ where: { id: e.id } });
    } else restants++;
  }
  return restants;
}

// Une adresse qui se désabonne ne doit pas recevoir une lettre déjà programmée
export async function annulerEnvoisProgrammesPour(email: string) {
  const envois = await prisma.envoiLettre.findMany({
    where: { email: email.toLowerCase(), lettre: { statut: "programmee", programmeeLe: { gt: new Date() } } },
    select: { id: true, resendId: true, lettreId: true },
  });
  await annulerEnvois(envois);
  for (const lettreId of new Set(envois.map((e) => e.lettreId))) {
    const n = await prisma.envoiLettre.count({ where: { lettreId } });
    await prisma.lettre.update({ where: { id: lettreId }, data: { envoyes: n } });
  }
}

export async function envoyerTest(sujet: string, contenu: string, email: string, nom: string) {
  return envoyerCourriel(await courrielLettre(`[Test] ${sujet}`, contenu, { email, nom, abonne: false }));
}
