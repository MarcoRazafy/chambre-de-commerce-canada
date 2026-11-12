import "server-only";

// L'offre de la Chambre en cours (réglée par l'Admin GM) et la configuration de facturation qui en découle
import { prisma } from "@/lib/db";
import { configPlateforme, UTILISATEURS_OFFERTS } from "@/lib/plateforme";

export async function offreDeLaChambre() {
  const c = await prisma.chambre.findFirst({ select: { offre: true } });
  return c?.offre ?? null;
}

// Prix de l'offre de la Chambre ; taxes et jour de facturation de l'environnement
export async function configDeLaChambre() {
  const base = configPlateforme();
  const offre = await offreDeLaChambre();
  return {
    config: offre ? { ...base, forfait: offre.forfait, parUtilisateur: offre.parUtilisateur } : base,
    offre,
    offerts: offre?.utilisateursOfferts ?? UTILISATEURS_OFFERTS,
  };
}
