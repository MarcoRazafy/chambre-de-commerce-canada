import "server-only";

import { adresseOuSite } from "@/lib/adresse-chambre";
import { prismaSysteme } from "@/lib/db";

export async function liensMembres(chambreId: string): Promise<{ adhesion: string; connexion: string } | null> {
  const c = await prismaSysteme.chambre.findUnique({ where: { id: chambreId }, select: { slug: true } });
  const base = c ? await adresseOuSite(chambreId, "client") : null;
  if (!base || !c) return null;
  const q = `?chambre=${encodeURIComponent(c.slug)}`;
  return { adhesion: `${base}/auth/inscription${q}`, connexion: `${base}/auth${q}` };
}
