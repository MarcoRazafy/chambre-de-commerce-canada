import "server-only";

import { prisma } from "@/lib/db";
import { fonctionsOuvertes } from "@/lib/fonctions-plateforme";
import { configPlateforme, forfaitOffre, UTILISATEURS_OFFERTS } from "@/lib/plateforme";

export async function offreDeLaChambre() {
  const c = await prisma.chambre.findFirst({ select: { offre: true, fonctionsChoisies: true } });
  if (!c) return null;
  return {
    ...c.offre,
    base: c.offre.forfait,
    forfait: forfaitOffre(c.offre, c.fonctionsChoisies),
    fonctions: fonctionsOuvertes(c.offre, c.fonctionsChoisies),
    choisies: c.fonctionsChoisies,
  };
}

export async function configDeLaChambre() {
  const base = configPlateforme();
  const offre = await offreDeLaChambre();
  return {
    config: offre ? { ...base, forfait: offre.forfait, parUtilisateur: offre.parUtilisateur } : base,
    offre,
    offerts: offre?.utilisateursOfferts ?? UTILISATEURS_OFFERTS,
  };
}
