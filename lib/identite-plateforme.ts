import "server-only";

// Identité de la plateforme (réglée par l'Admin GM dans Paramètres › Plateforme) : ce qui figure comme émetteur
// sur les factures de l'abonnement des Chambres. Lecture sans limite de Chambre.
import { prismaSysteme as db } from "@/lib/db";

export const NOM_PLATEFORME = "L’Alliée Virtuelle";

export type IdentitePlateforme = {
  nom: string;
  raisonSociale: string;
  adresse: string;
  courriel: string;
  telephone: string;
  neq: string;
  numeroTps: string;
  numeroTvq: string;
  hebergeur: string;
};

export async function identitePlateforme(): Promise<IdentitePlateforme> {
  const l = await db.reglagesPlateforme.findUnique({
    where: { id: "plateforme" },
    select: { nom: true, raisonSociale: true, adresse: true, courriel: true, telephone: true, neq: true, numeroTps: true, numeroTvq: true, hebergeur: true },
  });
  const v = (k: keyof IdentitePlateforme) => l?.[k]?.trim() ?? "";
  return {
    nom: v("nom") || NOM_PLATEFORME,
    raisonSociale: v("raisonSociale"),
    adresse: v("adresse"),
    courriel: v("courriel"),
    telephone: v("telephone"),
    neq: v("neq"),
    numeroTps: v("numeroTps"),
    numeroTvq: v("numeroTvq"),
    hebergeur: v("hebergeur"),
  };
}

// Les numéros d'entreprise et de taxes, pour le pied d'une facture
export function numerosPlateforme(i: IdentitePlateforme): string[] {
  return [i.neq && `NEQ ${i.neq}`, i.numeroTps && `N° TPS ${i.numeroTps}`, i.numeroTvq && `N° TVQ ${i.numeroTvq}`].filter((x): x is string => Boolean(x));
}
