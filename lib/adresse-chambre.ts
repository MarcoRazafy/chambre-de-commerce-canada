import "server-only";

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

export function adresseEspace(espace: EspacePartage): string | null {
  const plateforme = process.env.DOMAINE_PLATEFORME?.trim().toLowerCase();
  const sous = SOUS_DOMAINE_ESPACE[espace];
  if (plateforme) return `https://${sous}.${plateforme}`;
  if (process.env.NODE_ENV !== "production") return `http://${sous}.localhost:${portLocal()}`;
  return null;
}

async function adressePropre(chambreId: string): Promise<string | null> {
  const m = memoire.get(chambreId);
  if (m && m.jusqua > Date.now()) return m.propre;
  const c = await prismaSysteme.chambre.findUnique({ where: { id: chambreId }, select: { domaine: true } });
  const principal = process.env.DOMAINE_PRINCIPAL?.trim().toLowerCase();
  const propre = !c ? null : c.domaine ? `https://${c.domaine}` : chambreId === CHAMBRE_PRINCIPALE && principal ? `https://${principal}` : null;
  memoire.set(chambreId, { jusqua: Date.now() + 60_000, propre });
  return propre;
}

export async function adresseDeLaChambre(chambreId: string, espace: EspacePartage = "client"): Promise<string | null> {
  return (await adressePropre(chambreId)) ?? adresseEspace(espace);
}

export async function adresseOuSite(chambreId: string, espace: EspacePartage = "client"): Promise<string | null> {
  const adresse = await adresseDeLaChambre(chambreId, espace);
  if (adresse) return adresse;
  if (chambreId !== CHAMBRE_PRINCIPALE) return null;
  return process.env.APP_URL?.trim().replace(/\/+$/, "") || null;
}

export function adresseSitePlateforme(): string | null {
  const plateforme = process.env.DOMAINE_PLATEFORME?.trim().toLowerCase();
  if (plateforme) return `https://${plateforme}`;
  if (process.env.NODE_ENV !== "production") return `http://www.localhost:${portLocal()}`;
  return null;
}
