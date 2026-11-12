import "server-only";

// Le retard de paiement de l'abonnement de la Chambre en cours (bandeau de l'espace)
import { prisma, reglagesRetard } from "@/lib/db";
import { etatRetard } from "@/lib/retards";

export async function etatPaiementChambre() {
  const [factures, r] = await Promise.all([
    prisma.facturePlateforme.findMany({
      where: { payeeLe: null, suivie: true },
      orderBy: { date: "asc" },
      select: { numero: true, date: true, payeeLe: true, suivie: true },
    }),
    reglagesRetard(),
  ]);
  return { ...etatRetard(factures, r), numero: factures[0]?.numero ?? null };
}
export type EtatPaiement = Awaited<ReturnType<typeof etatPaiementChambre>>;
