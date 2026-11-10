import "server-only";

import { prisma } from "@/lib/db";
import { tagsSelonRegles } from "@/lib/tags";

export function getReglesTags() {
  return prisma.regleTag.findMany({ orderBy: { createdAt: "asc" } });
}

// Applique les règles à toutes les entreprises ; renvoie le nombre d'entreprises modifiées
export async function appliquerReglesTags(): Promise<number> {
  const regles = await prisma.regleTag.findMany({ select: { statut: true, tag: true, actif: true } });
  if (!regles.some((r) => r.actif)) return 0;
  const membres = await prisma.member.findMany({ select: { id: true, statut: true, etiquettes: true } });
  let modifies = 0;
  for (const m of membres) {
    const suite = tagsSelonRegles(m.etiquettes, m.statut, regles);
    if (!suite) continue;
    await prisma.member.update({ where: { id: m.id }, data: { etiquettes: suite } });
    modifies++;
  }
  return modifies;
}
