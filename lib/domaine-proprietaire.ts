import "server-only";

// Propriété d'un domaine d'expédition, Chambre par Chambre. Toutes les Chambres partagent le même compte Brevo : un
// domaine validé chez Brevo l'est pour toutes. Une Chambre ne peut donc envoyer depuis son domaine que si elle prouve
// en avoir la main : un enregistrement TXT propre à elle et à ce domaine (signé avec la clé du serveur), lu dans le
// DNS par la plateforme elle-même. Les domaines de la plateforme et celui d'une autre Chambre sont refusés d'emblée.
import { Resolver } from "node:dns/promises";
import { etatDomaine, type EtatDomaine } from "@/lib/brevo-domaines";
import { prismaSysteme } from "@/lib/db";
import { signer } from "@/lib/signature";

export const PREFIXE_PREUVE = "lalliee-virtuelle-verification=";

// La valeur TXT à poser sur le domaine (nom « @ ») : la même pour une Chambre et un domaine, différente d'une autre
export const preuveDomaine = (chambreId: string, domaine: string) =>
  `${PREFIXE_PREUVE}${signer(`${chambreId}:${domaine.toLowerCase()}`, "domaine-expediteur").slice(0, 32)}`;

// Les textes TXT d'un domaine (les morceaux d'un même enregistrement recollés) ; vide si le domaine n'en a pas
async function txtDuDomaine(domaine: string): Promise<string[]> {
  const resolveur = new Resolver({ timeout: 4000, tries: 2 });
  try {
    return (await resolveur.resolveTxt(domaine)).map((morceaux) => morceaux.join(""));
  } catch {
    return [];
  }
}

// La preuve est-elle en place ? Réponse gardée 10 min si oui, 1 min si non (le temps d'ajouter l'enregistrement)
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

// Un domaine (ou sous-domaine) de la plateforme elle-même, ou celui de son adresse d'envoi : jamais à une Chambre
export function domaineDeLaPlateforme(domaine: string, domaineServeur: string): boolean {
  const d = domaine.toLowerCase();
  const plateforme = process.env.DOMAINE_PLATEFORME?.trim().toLowerCase();
  const serveur = domaineServeur.trim().toLowerCase();
  return (!!plateforme && (d === plateforme || d.endsWith(`.${plateforme}`))) || (!!serveur && (d === serveur || d.endsWith(`.${serveur}`)));
}

// Le domaine est-il déjà celui d'une autre Chambre ? Son nom, pour le message
export async function domaineDUneAutreChambre(chambreId: string, domaine: string): Promise<string | null> {
  const autre = await prismaSysteme.profilChambre.findFirst({
    where: { expediteurDomaine: domaine.toLowerCase(), chambreId: { not: chambreId } },
    select: { chambreId: true },
  });
  return autre ? autre.chambreId : null;
}

// L'état du domaine pour une Chambre : celui de Brevo, plus la preuve de propriété (ligne TXT ajoutée aux
// enregistrements à copier). Validé seulement si Brevo l'a authentifié et que la preuve de cette Chambre est en place.
export async function avecPreuve(chambreId: string, e: EtatDomaine): Promise<EtatDomaine> {
  if (e.etat !== "valide" && e.etat !== "en_attente") return e;
  const preuve = { type: "TXT", nom: "@", valeur: preuveDomaine(chambreId, e.domaine), ok: await preuvePresente(chambreId, e.domaine) };
  if (e.etat === "valide") return preuve.ok ? e : { etat: "en_attente", domaine: e.domaine, enregistrements: [preuve] };
  // Juste après le code Brevo (l'autre TXT sur « @ »)
  const i = e.enregistrements.findIndex((x) => x.type === "TXT" && x.nom === "@");
  const liste = [...e.enregistrements];
  liste.splice(i >= 0 ? i + 1 : 0, 0, preuve);
  return { ...e, enregistrements: liste };
}
export async function etatDomaineChambre(chambreId: string, domaine: string): Promise<EtatDomaine> {
  return avecPreuve(chambreId, await etatDomaine(domaine));
}
