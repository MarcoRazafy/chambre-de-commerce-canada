import "server-only";

import { Resolver } from "node:dns/promises";
import { etatDomaine, type EtatDomaine } from "@/lib/brevo-domaines";
import { prismaSysteme } from "@/lib/db";
import { signer } from "@/lib/signature";

export const PREFIXE_PREUVE = "lalliee-virtuelle-verification=";

export const preuveDomaine = (chambreId: string, domaine: string) =>
  `${PREFIXE_PREUVE}${signer(`${chambreId}:${domaine.toLowerCase()}`, "domaine-expediteur").slice(0, 32)}`;

async function txtDuDomaine(domaine: string): Promise<string[]> {
  const resolveur = new Resolver({ timeout: 4000, tries: 2 });
  try {
    return (await resolveur.resolveTxt(domaine)).map((morceaux) => morceaux.join(""));
  } catch {
    return [];
  }
}

const memoire = new Map<string, { jusqua: number; ok: boolean }>();
export async function preuvePresente(chambreId: string, domaine: string, lire = txtDuDomaine): Promise<boolean> {
  const cle = `${chambreId}:${domaine.toLowerCase()}`;
  const m = memoire.get(cle);
  if (m && m.jusqua > Date.now()) return m.ok;
  const attendu = preuveDomaine(chambreId, domaine);
  const ok = (await lire(domaine.toLowerCase())).some((t) => t.trim() === attendu);
  if (memoire.size > 2_000) memoire.clear();
  memoire.set(cle, { jusqua: Date.now() + (ok ? 600_000 : 60_000), ok });
  return ok;
}
export function oublierPreuve(domaine?: string) {
  if (!domaine) return memoire.clear();
  for (const cle of memoire.keys()) if (cle.endsWith(`:${domaine.toLowerCase()}`)) memoire.delete(cle);
}

export function domaineDeLaPlateforme(domaine: string, domaineServeur: string): boolean {
  const d = domaine.toLowerCase();
  const plateforme = process.env.DOMAINE_PLATEFORME?.trim().toLowerCase();
  const serveur = domaineServeur.trim().toLowerCase();
  return (!!plateforme && (d === plateforme || d.endsWith(`.${plateforme}`))) || (!!serveur && (d === serveur || d.endsWith(`.${serveur}`)));
}

export async function domaineDUneAutreChambre(chambreId: string, domaine: string): Promise<string | null> {
  const autre = await prismaSysteme.profilChambre.findFirst({
    where: { expediteurDomaine: domaine.toLowerCase(), chambreId: { not: chambreId } },
    select: { chambreId: true },
  });
  return autre ? autre.chambreId : null;
}

export async function avecPreuve(chambreId: string, e: EtatDomaine): Promise<EtatDomaine> {
  if (e.etat !== "valide" && e.etat !== "en_attente") return e;
  const preuve = { type: "TXT", nom: "@", valeur: preuveDomaine(chambreId, e.domaine), ok: await preuvePresente(chambreId, e.domaine) };
  if (e.etat === "valide") return preuve.ok ? e : { etat: "en_attente", domaine: e.domaine, enregistrements: [preuve] };
  const i = e.enregistrements.findIndex((x) => x.type === "TXT" && x.nom === "@");
  const liste = [...e.enregistrements];
  liste.splice(i >= 0 ? i + 1 : 0, 0, preuve);
  return { ...e, enregistrements: liste };
}
export async function etatDomaineChambre(chambreId: string, domaine: string): Promise<EtatDomaine> {
  return avecPreuve(chambreId, await etatDomaine(domaine));
}
