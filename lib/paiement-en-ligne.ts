import "server-only";

import { networkInterfaces } from "node:os";
import { headers } from "next/headers";
import type { Prisma } from "@/lib/generated/prisma/client";
import { adresseDeLaChambre } from "@/lib/adresse-chambre";
import { chambreCourante } from "@/lib/chambre-courante";
import { prisma } from "@/lib/db";
import { referenceReglement } from "@/lib/reglements";
import { marqueLocale, versRelais } from "@/lib/retour-paiement";
import { baseSite } from "@/lib/site";
import type { ModeReglement } from "@/lib/modes-reglement";
import {
  lienDirectPortefeuille,
  ouvrirPaiement,
  type ModePaiement,
} from "@/lib/vanillapay";

function basePrestataire(): string {
  const domaine = process.env.DOMAINE_PRINCIPAL?.trim().toLowerCase();
  return domaine ? `https://${domaine}` : baseSite();
}

// Où revient le navigateur après le paiement : l'adresse de la Chambre (la session y est valable)
async function baseRetour(): Promise<string> {
  if (process.env.NODE_ENV === "production") {
    return (await adresseDeLaChambre(await chambreCourante())) ?? basePrestataire();
  }
  const h = await headers();
  const hote = h.get("x-forwarded-host") ?? h.get("host");
  if (!hote) return basePrestataire();
  const protocole =
    h.get("x-forwarded-proto") ??
    (/^(localhost|127\.0\.0\.1)(:|$)/.test(hote) ? "http" : "https");
  return `${protocole}://${hote}`;
}

function adresseReseau(): string | null {
  for (const cartes of Object.values(networkInterfaces())) {
    for (const carte of cartes ?? []) {
      if (carte.family === "IPv4" && !carte.internal) return carte.address;
    }
  }
  return null;
}

async function adresseRetour(
  chemin: string,
  portefeuille?: ModeReglement,
): Promise<string> {
  const base = await baseRetour();
  if (
    process.env.NODE_ENV !== "production" &&
    portefeuille === "orange_money"
  ) {
    const { hostname, port } = new URL(base);
    const marque = marqueLocale(hostname);
    const ip = marque ? adresseReseau() : null;
    if (marque && ip) {
      return `http://${ip}${port ? `:${port}` : ""}${versRelais(chemin, marque)}`;
    }
  }
  return `${base}${versRelais(chemin)}`;
}

export async function ouvrirChezLePrestataire(
  p: {
    id: string;
    montant: number;
    numeroFacture: string | null;
    portefeuille?: ModeReglement;
  },
  mode: ModePaiement,
  detail?: Prisma.InputJsonValue,
  cheminRetour: (reference: string) => string = (reference) =>
    `/membre/cotisations/retour?ref=${encodeURIComponent(reference)}`,
): Promise<{ url: string } | { raison: string }> {
  const reference = referenceReglement();
  await prisma.paiement.update({
    where: { id: p.id },
    data: {
      reference,
      statut: "en_cours",
      ...(detail === undefined ? {} : { detail }),
    },
  });

  const ouverture = await ouvrirPaiement({
    montant: p.montant,
    reference,
    panier: p.numeroFacture ?? reference,
    mode,
    notifUrl: `${basePrestataire()}/api/paiements/vanillapay`,
    redirectUrl: await adresseRetour(cheminRetour(reference), p.portefeuille),
  });
  if ("raison" in ouverture) return ouverture;

  if (ouverture.id) {
    await prisma.paiement.update({
      where: { id: p.id },
      data: { transaction: ouverture.id },
    });
  }
  return {
    url: p.portefeuille
      ? lienDirectPortefeuille(ouverture.url, p.portefeuille)
      : ouverture.url,
  };
}
