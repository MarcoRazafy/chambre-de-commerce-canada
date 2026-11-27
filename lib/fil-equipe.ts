import "server-only";

import { prisma } from "@/lib/db";
import { after } from "next/server";
import { apercu, notifierEquipe } from "@/lib/push";

export async function filEquipe(userId: string): Promise<string> {
  const existant = await prisma.messageThread.findFirst({
    where: { equipe: true, participants: { some: { userId } } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (existant) {
    await rattacherEquipe(existant.id);
    return existant.id;
  }

  const equipe = await prisma.user.findMany({
    where: { role: "admin" },
    select: { id: true },
  });
  const fil = await prisma.messageThread.create({
    data: {
      type: "individuel",
      equipe: true,
      nom: "Équipe de la Chambre",
      participants: {
        create: [
          { userId, luLe: new Date() },
          ...equipe.map((a) => ({ userId: a.id })),
        ],
      },
    },
    select: { id: true },
  });
  return fil.id;
}

export async function rattacherEquipe(threadId?: string): Promise<void> {
  const [equipe, fils] = await Promise.all([
    prisma.user.findMany({ where: { role: "admin" }, select: { id: true } }),
    prisma.messageThread.findMany({
      where: { equipe: true, ...(threadId ? { id: threadId } : {}) },
      select: { id: true, participants: { select: { userId: true } } },
    }),
  ]);
  const manquants = fils.flatMap((f) => {
    const deja = new Set(f.participants.map((p) => p.userId));
    return equipe
      .filter((a) => !deja.has(a.id))
      .map((a) => ({ threadId: f.id, userId: a.id }));
  });
  if (manquants.length) {
    await prisma.participantFil.createMany({
      data: manquants,
      skipDuplicates: true,
    });
  }
}

export async function ecrireAEquipe(
  user: { id: string; nom: string },
  texte: string,
): Promise<string> {
  const threadId = await filEquipe(user.id);
  const maintenant = new Date();
  await prisma.message.create({
    data: {
      threadId,
      auteur: user.nom,
      userId: user.id,
      sentAt: maintenant,
      texte,
    },
  });
  await prisma.participantFil.updateMany({
    where: { threadId, userId: user.id },
    data: { luLe: maintenant },
  });

  after(() =>
    notifierEquipe({
      titre: `Message de ${user.nom}`,
      corps: apercu(texte),
      url: `/admin/messagerie?t=${threadId}`,
      etiquette: `fil-${threadId}`,
    }),
  );
  return threadId;
}
