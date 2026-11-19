import "server-only";

import { prisma } from "@/lib/db";
import { offreDeLaChambre } from "@/lib/offre-chambre";

export async function limiteAtteinte(quoi: "membres" | "equipe", enPlus = 1): Promise<string | null> {
  const offre = await offreDeLaChambre();
  if (!offre) return null;
  if (quoi === "membres" && offre.maxMembres != null) {
    const n = await prisma.member.count({ where: { statut: { not: "refusee" } } });
    if (n + enPlus > offre.maxMembres) return `L’offre ${offre.nom} est limitée à ${offre.maxMembres} membres : passez à une offre supérieure (Abonnement).`;
  }
  if (quoi === "equipe" && offre.maxUtilisateurs != null) {
    const n = await prisma.user.count({ where: { role: "admin" } });
    if (n + enPlus > offre.maxUtilisateurs) {
      return `L’offre ${offre.nom} est limitée à ${offre.maxUtilisateurs} compte${offre.maxUtilisateurs > 1 ? "s" : ""} d’équipe : passez à une offre supérieure (Abonnement).`;
    }
  }
  return null;
}
