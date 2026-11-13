import "server-only";

import { prisma } from "@/lib/db";
import { initialesDe, LOGO_EQUIPE } from "@/lib/avatars";
import type { PieceJointe } from "@/lib/types";

export interface MessageSupport {
  id: string;
  de: string;
  moi: boolean;
  equipe: boolean;
  texte: string;
  envoyeLe: string;
  supprime: boolean;
  pieces: PieceJointe[];
}

export interface ConversationSupport {
  id: string;
  nom: string;
  sousTitre: string;
  avatar: string | null;
  init: string;
  membreId: string | null;
  nonLus: number;
  messages: MessageSupport[];
}

const PERSONNE = {
  id: true,
  nom: true,
  photo: true,
  role: true,
  member: { select: { id: true, nom: true } },
} as const;

const DERNIERS = 60;

async function nonLusParFil(userId: string): Promise<Map<string, number>> {
  const lignes = await prisma.$queryRaw<{ fil: string; n: number }[]>`
    SELECT m."threadId" AS fil, count(*)::int AS n
    FROM messages m
    JOIN participants_fils p
      ON p."threadId" = m."threadId" AND p."userId" = ${userId}
    JOIN message_threads t ON t.id = m."threadId" AND t.equipe
    WHERE m."supprimeLe" IS NULL
      AND m."userId" IS DISTINCT FROM ${userId}
      AND (p."luLe" IS NULL OR m."sentAt" > p."luLe")
    GROUP BY m."threadId"`;
  return new Map(lignes.map((l) => [l.fil, l.n]));
}

async function messagesDe(
  threadId: string,
  userId: string,
): Promise<MessageSupport[]> {
  const lignes = await prisma.message.findMany({
    where: { threadId },
    orderBy: { sentAt: "desc" },
    take: DERNIERS,
    include: { piecesJointes: { orderBy: { createdAt: "asc" } } },
  });
  const auteurs = [...new Set(lignes.map((m) => m.userId).filter(Boolean))];
  const admins = new Set(
    (
      await prisma.user.findMany({
        where: { id: { in: auteurs as string[] }, role: "admin" },
        select: { id: true },
      })
    ).map((u) => u.id),
  );

  return lignes.reverse().map((m) => ({
    id: m.id,
    de: m.auteur,
    moi: m.userId === userId,
    equipe: m.userId !== userId && admins.has(m.userId ?? ""),
    texte: m.supprimeLe ? "" : m.texte,
    envoyeLe: m.sentAt.toISOString(),
    supprime: Boolean(m.supprimeLe),
    pieces: m.supprimeLe
      ? []
      : m.piecesJointes.map((p) => ({
          id: p.id,
          nom: p.nom,
          type: p.type,
          taille: p.taille,
        })),
  }));
}

export async function supportMembre(userId: string): Promise<{
  conversation: ConversationSupport | null;
  nonLus: number;
}> {
  const fil = await prisma.messageThread.findFirst({
    where: { equipe: true, participants: { some: { userId } } },
    orderBy: { createdAt: "asc" },
    select: { id: true, nom: true },
  });
  if (!fil) return { conversation: null, nonLus: 0 };

  const [compte, messages] = await Promise.all([
    nonLusParFil(userId),
    messagesDe(fil.id, userId),
  ]);
  const nonLus = compte.get(fil.id) ?? 0;
  const nom = fil.nom ?? "Équipe CanCham";
  return {
    conversation: {
      id: fil.id,
      nom,
      sousTitre: "Support membres",
      avatar: LOGO_EQUIPE,
      init: initialesDe(nom),
      membreId: null,
      nonLus,
      messages,
    },
    nonLus,
  };
}

export interface MessageRecu {
  id: string;
  threadId: string;
  auteur: string;
  entreprise: string;
  avatar: string | null;
  init: string;
  texte: string;
  pieces: number;
  le: string;
  nonLu: boolean;
}

export async function derniersMessagesMembres(
  userId: string,
  limite = 6,
): Promise<MessageRecu[]> {
  const equipe = (
    await prisma.user.findMany({
      where: { role: "admin" },
      select: { id: true },
    })
  ).map((u) => u.id);

  const lignes = await prisma.message.findMany({
    where: {
      supprimeLe: null,
      thread: { equipe: true, participants: { some: { userId } } },
      OR: [{ userId: null }, { userId: { notIn: equipe } }],
    },
    orderBy: { sentAt: "desc" },
    take: limite,
    include: { _count: { select: { piecesJointes: true } } },
  });

  const [auteurs, lectures] = await Promise.all([
    prisma.user.findMany({
      where: {
        id: { in: lignes.map((m) => m.userId).filter((id) => id !== null) },
      },
      select: PERSONNE,
    }),
    prisma.participantFil.findMany({
      where: { userId, threadId: { in: lignes.map((m) => m.threadId) } },
      select: { threadId: true, luLe: true },
    }),
  ]);

  return lignes.map((m) => {
    const u = auteurs.find((a) => a.id === m.userId);
    const lu = lectures.find((l) => l.threadId === m.threadId)?.luLe;
    const nom = u?.nom ?? m.auteur;
    return {
      id: m.id,
      threadId: m.threadId,
      auteur: nom,
      entreprise: u?.member?.nom ?? "",
      avatar: u?.photo ?? null,
      init: initialesDe(nom),
      texte: m.texte,
      pieces: m._count.piecesJointes,
      le: m.sentAt.toISOString(),
      nonLu: !lu || m.sentAt > lu,
    };
  });
}
