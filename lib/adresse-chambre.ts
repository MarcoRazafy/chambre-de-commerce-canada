import "server-only";

// Les adresses web, pour les liens envoyés (courriels, retour de paiement, connexion, adhésion) :
//  - un espace partagé : dev.DOMAINE_PLATEFORME (les équipes) ou client.DOMAINE_PLATEFORME (les membres) ; en
//    développement, http://dev.localhost:port et http://client.localhost:port ;
//  - une Chambre : son domaine propre s'il y en a un, la Chambre n° 1 : DOMAINE_PRINCIPAL s'il est réglé, sinon
//    l'espace partagé demandé (la Chambre y est celle du compte connecté).
// Le domaine nu (et localhost en développement) affiche le site de la plateforme.
import { CHAMBRE_PRINCIPALE } from "@/lib/chambre-courante";
import { prismaSysteme } from "@/lib/db";
import { SOUS_DOMAINE_ESPACE, type EspacePartage } from "@/lib/hote-chambre";

const memoire = new Map<string, { jusqua: number; propre: string | null }>();
export function oublierAdressesChambres() {
  memoire.clear();
}

function portLocal(): string {
  try {
    const p = new URL(process.env.APP_URL ?? "").port;
    if (p) return p;
  } catch {}
  return process.env.PORT || "3000";
}

// L'adresse d'un espace partagé (dev. : les équipes, client. : les membres)
export function adresseEspace(espace: EspacePartage): string | null {
  const plateforme = process.env.DOMAINE_PLATEFORME?.trim().toLowerCase();
  const sous = SOUS_DOMAINE_ESPACE[espace];
  if (plateforme) return `https://${sous}.${plateforme}`;
  if (process.env.NODE_ENV !== "production") return `http://${sous}.localhost:${portLocal()}`;
  return null;
}

// L'adresse propre d'une Chambre (domaine propre, ou DOMAINE_PRINCIPAL pour la Chambre n° 1) ; null sinon
async function adressePropre(chambreId: string): Promise<string | null> {
  const m = memoire.get(chambreId);
  if (m && m.jusqua > Date.now()) return m.propre;
  const c = await prismaSysteme.chambre.findUnique({ where: { id: chambreId }, select: { domaine: true } });
  const principal = process.env.DOMAINE_PRINCIPAL?.trim().toLowerCase();
  const propre = !c ? null : c.domaine ? `https://${c.domaine}` : chambreId === CHAMBRE_PRINCIPALE && principal ? `https://${principal}` : null;
  memoire.set(chambreId, { jusqua: Date.now() + 60_000, propre });
  return propre;
}

// L'adresse où aller pour une Chambre : son adresse propre, sinon l'espace partagé (les membres par défaut)
export async function adresseDeLaChambre(chambreId: string, espace: EspacePartage = "client"): Promise<string | null> {
  return (await adressePropre(chambreId)) ?? adresseEspace(espace);
}

// Comme adresseDeLaChambre ; sans espace partagé réglé (ni DOMAINE_PLATEFORME, ni développement), la Chambre n° 1
// garde l'adresse du site (APP_URL)
export async function adresseOuSite(chambreId: string, espace: EspacePartage = "client"): Promise<string | null> {
  const adresse = await adresseDeLaChambre(chambreId, espace);
  if (adresse) return adresse;
  if (chambreId !== CHAMBRE_PRINCIPALE) return null;
  return process.env.APP_URL?.trim().replace(/\/+$/, "") || null;
}

// L'adresse du site public de la plateforme (DOMAINE_PLATEFORME) ; en développement, http://www.localhost:port
export function adresseSitePlateforme(): string | null {
  const plateforme = process.env.DOMAINE_PLATEFORME?.trim().toLowerCase();
  if (plateforme) return `https://${plateforme}`;
  if (process.env.NODE_ENV !== "production") return `http://www.localhost:${portLocal()}`;
  return null;
}
