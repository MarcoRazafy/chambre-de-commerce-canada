import "server-only";

// Limites de l'offre de la Chambre en cours (réglées par l'Admin GM) : nombre de membres, comptes d'équipe.
// Limite atteinte : le message à afficher (avec la piste de l'offre Payante), sinon null.
import { prisma } from "@/lib/db";
import { offreDeLaChambre } from "@/lib/offre-chambre";

// « membres » : les entreprises (sauf les adhésions refusées) ; « equipe » : les comptes de l'équipe
export async function limiteAtteinte(quoi: "membres" | "equipe", enPlus = 1): Promise<string | null> {
  const offre = await offreDeLaChambre();
  if (!offre) return null;
  if (quoi === "membres" && offre.maxMembres != null) {
    const n = await prisma.member.count({ where: { statut: { not: "refusee" } } });
    if (n + enPlus > offre.maxMembres) return `L’offre ${offre.nom} est limitée à ${offre.maxMembres} membres : passez à l’offre Payante (Abonnement).`;
  }
  if (quoi === "equipe" && offre.maxUtilisateurs != null) {
    const n = await prisma.user.count({ where: { role: "admin" } });
    if (n + enPlus > offre.maxUtilisateurs) {
      return `L’offre ${offre.nom} est limitée à ${offre.maxUtilisateurs} compte${offre.maxUtilisateurs > 1 ? "s" : ""} d’équipe : passez à l’offre Payante (Abonnement).`;
    }
  }
  return null;
}
