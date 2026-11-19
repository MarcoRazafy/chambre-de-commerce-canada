import "server-only";

import { prisma } from "@/lib/db";
import { ajouterTags } from "@/lib/tags";
import { chambreCourante } from "@/lib/chambre-courante";

export async function poserTags(memberIds: string[], tags: string[]): Promise<number> {
  const chambreId = await chambreCourante();
  for (const nom of tags) await prisma.tag.upsert({ where: { chambreId_nom: { chambreId, nom } }, create: { nom }, update: {} });
  if (!memberIds.length || !tags.length) return 0;
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
