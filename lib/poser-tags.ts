import "server-only";

import { prisma } from "@/lib/db";
import { ajouterTags } from "@/lib/tags";

// Pose des tags sur des entreprises (sans retirer ceux qu'elles ont) et les garde dans la liste des tags.
// Renvoie le nombre d'entreprises qui ont reçu au moins un nouveau tag.
export async function poserTags(memberIds: string[], tags: string[]): Promise<number> {
  if (!memberIds.length || !tags.length) return 0;
  for (const nom of tags) await prisma.tag.upsert({ where: { nom }, create: { nom }, update: {} });
  const ms = await prisma.member.findMany({ where: { id: { in: [...new Set(memberIds)] } }, select: { id: true, etiquettes: true } });
  let n = 0;
  for (const m of ms) {
    const suite = ajouterTags(m.etiquettes, tags);
    if (!suite) continue;
    await prisma.member.update({ where: { id: m.id }, data: { etiquettes: suite } });
    n++;
  }
  return n;
}
