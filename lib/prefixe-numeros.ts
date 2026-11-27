import "server-only";

import { CHAMBRE_PRINCIPALE, chambreCourante } from "@/lib/chambre-courante";
import { getProfilChambreBrut } from "@/lib/profil-chambre";
import { nettoyerPrefixe, prefixeParDefaut } from "@/lib/prefixe-numeros-base";

export async function prefixeNumeros(): Promise<string> {
  const [brut, chambreId] = await Promise.all([getProfilChambreBrut(), chambreCourante()]);
  const regle = nettoyerPrefixe(brut?.prefixeNumeros ?? "");
  return regle.length >= 2 ? regle : prefixeParDefaut(brut?.nom ?? "", chambreId === CHAMBRE_PRINCIPALE);
}
