import "server-only";

import { cache } from "react";
import { CHAMBRE_PRINCIPALE, chambreCourante } from "@/lib/chambre-courante";
import { FUSEAU_CANCHAM, FUSEAU_PAR_DEFAUT, fuseauConnu } from "@/lib/fuseau";
import { getProfilChambreBrut } from "@/lib/profil-chambre";

const fuseauDe = cache(async (chambreId: string): Promise<string> => {
  const choisi = (await getProfilChambreBrut())?.fuseau?.trim() ?? "";
  if (fuseauConnu(choisi)) return choisi;
  return chambreId === CHAMBRE_PRINCIPALE ? FUSEAU_CANCHAM : FUSEAU_PAR_DEFAUT;
});

export async function getFuseau(): Promise<string> {
  return fuseauDe(await chambreCourante());
}
