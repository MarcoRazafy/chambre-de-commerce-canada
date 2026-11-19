import "server-only";

import { prisma } from "@/lib/db";
import { aujourdhuiISO } from "@/lib/format";
import { configDeLaChambre } from "@/lib/offre-chambre";
import { dateFactureDuMois, facturePlateforme, numeroFacturePlateforme, offreGratuite } from "@/lib/plateforme";
import { getAdministrateurs } from "@/lib/queries-admin";

async function creerFacture(date: string, suivie: boolean) {
  const { config: c, offerts } = await configDeLaChambre();
  const n = (await getAdministrateurs()).length;
  const f = facturePlateforme(n, c, offerts);
  await prisma.facturePlateforme.createMany({
    data: [{
      numero: numeroFacturePlateforme(date), date: new Date(`${date}T00:00:00Z`), forfait: f.forfait, utilisateurs: n, parUtilisateur: c.parUtilisateur,
      tauxTps: c.tps, tauxTvq: c.tvq, sousTotal: f.sousTotal, tps: f.tps, tvq: f.tvq, total: f.total, suivie,
    }],
    skipDuplicates: true,
  });
}

export async function assurerFactureDuMois(aujourdhui = aujourdhuiISO()): Promise<void> {
  const { config: c, offre } = await configDeLaChambre();
  if (offre && offreGratuite(offre)) return;
  const date = dateFactureDuMois(aujourdhui, c.jourFacturation);
  if (!date) return;
  if (await prisma.facturePlateforme.findFirst({ where: { numero: numeroFacturePlateforme(date) }, select: { id: true } })) return;
  await creerFacture(date, true);
}

export async function factureDeDemarrage(aujourdhui = aujourdhuiISO()) {
  const { config: c } = await configDeLaChambre();
  const date = dateFactureDuMois(aujourdhui, c.jourFacturation) ?? `${aujourdhui.slice(0, 8)}${String(c.jourFacturation).padStart(2, "0")}`;
  const numero = numeroFacturePlateforme(date);
  if (!(await prisma.facturePlateforme.findFirst({ where: { numero }, select: { id: true } }))) await creerFacture(date, false);
  return prisma.facturePlateforme.findFirst({ where: { numero } });
}

export function getFacturesPlateforme() {
  return prisma.facturePlateforme.findMany({ orderBy: { date: "desc" } });
}

export function getFacturePlateforme(numero: string) {
  return prisma.facturePlateforme.findFirst({ where: { numero } });
}
