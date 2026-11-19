import "server-only";

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
