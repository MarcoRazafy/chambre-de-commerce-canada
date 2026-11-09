import "server-only";

import { prisma } from "@/lib/db";
import { aujourdhuiISO } from "@/lib/format";
import { configPlateforme, dateFactureDuMois, facturePlateforme, numeroFacturePlateforme } from "@/lib/plateforme";
import { getAdministrateurs } from "@/lib/queries-admin";

// Crée la facture du mois une fois son jour arrivé, avec les comptes de l'équipe ce jour-là (sans doublon)
export async function assurerFactureDuMois(aujourdhui = aujourdhuiISO()): Promise<void> {
  const c = configPlateforme();
  const date = dateFactureDuMois(aujourdhui, c.jourFacturation);
  if (!date) return;
  const numero = numeroFacturePlateforme(date);
  if (await prisma.facturePlateforme.findUnique({ where: { numero }, select: { id: true } })) return;
  const n = (await getAdministrateurs()).length;
  const f = facturePlateforme(n, c);
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
  return prisma.facturePlateforme.findUnique({ where: { numero } });
}
