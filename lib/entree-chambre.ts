import "server-only";

// Le lien qui ouvre la session d'un compte dans son espace : dev. pour l'équipe, client. pour un membre (ou le domaine
// propre de sa Chambre). La session ne suit pas d'une adresse à l'autre : un jeton d'entrée à usage unique, valable
// 10 minutes, lu par /auth/entree. « plus » : l'offre choisie sur le site (présélectionnée au démarrage), ou la page
// où aller après la connexion (« suite »).
import { adresseOuSite } from "@/lib/adresse-chambre";
import { avecChambre } from "@/lib/chambre-courante";
import { prismaSysteme } from "@/lib/db";
import { espaceDuRole } from "@/lib/hote-chambre";
import { creerJeton } from "@/lib/jetons";

export async function lienEntree(chambreId: string, userId: string, plus: Record<string, string> = {}): Promise<string | null> {
  const u = await prismaSysteme.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!u) return null;
  const adresse = await adresseOuSite(chambreId, espaceDuRole(u.role));
  if (!adresse) return null;
  const jeton = await avecChambre(chambreId, () => creerJeton(userId, "connexion"));
  const extra = Object.fromEntries(Object.entries(plus).filter(([, v]) => v));
  return `${adresse}/auth/entree?${new URLSearchParams({ jeton, ...extra })}`;
}
