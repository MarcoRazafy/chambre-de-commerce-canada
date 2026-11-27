import "server-only";

import { cache } from "react";
import { chambreCourante } from "@/lib/chambre-courante";
import { prisma } from "@/lib/db";
import { DELAIS_PAR_DEFAUT, delaiValide, type Delais } from "@/lib/delais";

const delaisDe = cache(async (chambreId: string): Promise<Delais> => {
  const p = await prisma.profilChambre.findUnique({ where: { chambreId }, select: { delaiReglement: true, delaiBlocage: true } });
  return {
    reglement: delaiValide(p?.delaiReglement, DELAIS_PAR_DEFAUT.reglement),
    blocage: delaiValide(p?.delaiBlocage, DELAIS_PAR_DEFAUT.blocage),
  };
});

export async function getDelais(): Promise<Delais> {
  return delaisDe(await chambreCourante());
}
