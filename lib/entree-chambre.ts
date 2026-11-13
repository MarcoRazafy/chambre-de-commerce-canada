import "server-only";

// Le lien qui ouvre la session dans la Chambre d'un compte, à son adresse (la session ne suit pas d'une adresse à
// l'autre) : un jeton d'entrée à usage unique, valable 10 minutes, lu par /auth/entree. « plus » : l'offre choisie sur
// le site (présélectionnée au démarrage), ou la page où aller après la connexion (« suite »).
import { adresseOuSite } from "@/lib/adresse-chambre";
import { avecChambre } from "@/lib/chambre-courante";
import { creerJeton } from "@/lib/jetons";

export async function lienEntree(chambreId: string, userId: string, plus: Record<string, string> = {}): Promise<string | null> {
  const adresse = await adresseOuSite(chambreId);
  if (!adresse) return null;
  const jeton = await avecChambre(chambreId, () => creerJeton(userId, "connexion"));
  const extra = Object.fromEntries(Object.entries(plus).filter(([, v]) => v));
  return `${adresse}/auth/entree?${new URLSearchParams({ jeton, ...extra })}`;
}
