import "server-only";

import { prisma } from "@/lib/db";
import { aujourdhuiISO } from "@/lib/format";
import { configDeLaChambre } from "@/lib/offre-chambre";
import { dateFactureDuMois, facturePlateforme, numeroFacturePlateforme, offreGratuite } from "@/lib/plateforme";
import { getAdministrateurs } from "@/lib/queries-admin";

// Crée la facture du mois une fois son jour arrivé, aux prix de l'offre de la Chambre, avec les comptes de
// l'équipe ce jour-là (sans doublon). Offre gratuite : pas de facture.
export async function assurerFactureDuMois(aujourdhui = aujourdhuiISO()): Promise<void> {
  const { config: c, offre, offerts } = await configDeLaChambre();
  if (offre && offreGratuite(offre)) return;
  const date = dateFactureDuMois(aujourdhui, c.jourFacturation);
  if (!date) return;
  const numero = numeroFacturePlateforme(date);
  if (await prisma.facturePlateforme.findFirst({ where: { numero }, select: { id: true } })) return;
  const n = (await getAdministrateurs()).length;
  const f = facturePlateforme(n, c, offerts);
  await prisma.facturePlateforme.createMany({
    data: [{
      numero, date: new Date(`${date}T00:00:00Z`), forfait: f.forfait, utilisateurs: n, parUtilisateur: c.parUtilisateur,
      tauxTps: c.tps, tauxTvq: c.tvq, sousTotal: f.sousTotal, tps: f.tps, tvq: f.tvq, total: f.total,
    }],
    skipDuplicates: true,
  });
}

export function getFacturesPlateforme() {
  return prisma.facturePlateforme.findMany({ orderBy: { date: "desc" } });
}

export function getFacturePlateforme(numero: string) {
  return prisma.facturePlateforme.findFirst({ where: { numero } });
}
