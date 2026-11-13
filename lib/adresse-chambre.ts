import "server-only";

// L'adresse web d'une Chambre, pour les liens envoyés (courriels, retour de paiement, connexion) :
//  - son domaine propre s'il y en a un ;
//  - la Chambre n° 1 : DOMAINE_PRINCIPAL (sinon null : l'adresse habituelle du site, comme avant) ;
//  - les autres : « slug ».DOMAINE_PLATEFORME ; en développement, http://« slug ».localhost:port.
import { CHAMBRE_PRINCIPALE } from "@/lib/chambre-courante";
import { prismaSysteme } from "@/lib/db";

const memoire = new Map<string, { jusqua: number; adresse: string | null }>();
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

export async function adresseDeLaChambre(chambreId: string): Promise<string | null> {
  const m = memoire.get(chambreId);
  if (m && m.jusqua > Date.now()) return m.adresse;
  const c = await prismaSysteme.chambre.findUnique({ where: { id: chambreId }, select: { slug: true, domaine: true } });
  let adresse: string | null = null;
  const principal = process.env.DOMAINE_PRINCIPAL?.trim().toLowerCase();
  const plateforme = process.env.DOMAINE_PLATEFORME?.trim().toLowerCase();
  if (!c) adresse = null;
  else if (c.domaine) adresse = `https://${c.domaine}`;
  else if (chambreId === CHAMBRE_PRINCIPALE) adresse = principal ? `https://${principal}` : null;
  else if (plateforme) adresse = `https://${c.slug}.${plateforme}`;
  else if (process.env.NODE_ENV !== "production") adresse = `http://${c.slug}.localhost:${portLocal()}`;
  memoire.set(chambreId, { jusqua: Date.now() + 60_000, adresse });
  return adresse;
}

// L'adresse à donner pour aller dans une Chambre : la sienne, sinon (Chambre n° 1 sans adresse réglée) celle du site
export async function adresseOuSite(chambreId: string): Promise<string | null> {
  const propre = await adresseDeLaChambre(chambreId);
  if (propre) return propre;
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
