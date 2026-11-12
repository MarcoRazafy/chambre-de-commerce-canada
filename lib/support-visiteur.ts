import "server-only";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { envoyerCourriel, urlPublique } from "@/lib/courriel";
import { prisma } from "@/lib/db";
import { rattacherEquipe } from "@/lib/fil-equipe";
import { courrielReponseVisiteur } from "@/lib/modeles-courriels";

export const COOKIE_VISITEUR = "cancham_assistance";

const DUREE_COOKIE = 60 * 60 * 24 * 90;

export interface Visiteur {
  nom: string;
  email: string;
  telephone: string;
}

export interface MessageVisiteur {
  id: string;
  de: string;
  equipe: boolean;
  texte: string;
  envoyeLe: string;
  supprime: boolean;
}

export interface FilVisiteur {
  visiteur: Visiteur;
  messages: MessageVisiteur[];
}

export function visiteurDuFil(json: unknown): Visiteur | null {
  if (!json || typeof json !== "object") return null;
  const v = json as Record<string, unknown>;
  if (typeof v.nom !== "string" || typeof v.email !== "string") return null;
  return {
    nom: v.nom,
    email: v.email,
    telephone: typeof v.telephone === "string" ? v.telephone : "",
  };
}

async function cleCourante(): Promise<string | null> {
  return (await cookies()).get(COOKIE_VISITEUR)?.value ?? null;
}

export async function filVisiteur(): Promise<{
  id: string;
  visiteur: Visiteur;
} | null> {
  const cle = await cleCourante();
  if (!cle) return null;
  const fil = await prisma.messageThread.findFirst({
    where: { visiteurCle: cle },
    select: { id: true, visiteur: true },
  });
  const visiteur = fil && visiteurDuFil(fil.visiteur);
  return fil && visiteur ? { id: fil.id, visiteur } : null;
}

const DERNIERS = 50;

export async function conversationVisiteur(): Promise<FilVisiteur | null> {
  const fil = await filVisiteur();
  if (!fil) return null;

  const lignes = await prisma.message.findMany({
    where: { threadId: fil.id },
    orderBy: { sentAt: "desc" },
    take: DERNIERS,
    select: {
      id: true,
      auteur: true,
      texte: true,
      sentAt: true,
      userId: true,
      supprimeLe: true,
    },
  });

  return {
    visiteur: fil.visiteur,
    messages: lignes.reverse().map((m) => ({
      id: m.id,
      de: m.userId ? "Équipe CanCham" : m.auteur,
      equipe: m.userId !== null,
      texte: m.supprimeLe ? "" : m.texte,
      envoyeLe: m.sentAt.toISOString(),
      supprime: Boolean(m.supprimeLe),
    })),
  };
}

export async function ouvrirFilVisiteur(v: Visiteur): Promise<string> {
  const cle = randomBytes(24).toString("base64url");
  const equipe = await prisma.user.findMany({
    where: { role: "admin" },
    select: { id: true },
  });
  const fil = await prisma.messageThread.create({
    data: {
      type: "individuel",
      equipe: true,
      nom: v.nom,
      visiteur: { ...v },
      visiteurCle: cle,
      participants: { create: equipe.map((a) => ({ userId: a.id })) },
    },
    select: { id: true },
  });
  await rattacherEquipe(fil.id);

  (await cookies()).set(COOKIE_VISITEUR, cle, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DUREE_COOKIE,
  });
  return fil.id;
}

export async function ecrireDuVisiteur(
  threadId: string,
  nom: string,
  texte: string,
): Promise<void> {
  await prisma.message.create({
    data: { threadId, auteur: nom, texte, sentAt: new Date() },
  });
}

export async function prevenirVisiteur(
  threadId: string,
  reponse: string,
): Promise<void> {
  const fil = await prisma.messageThread.findUnique({
    where: { id: threadId },
    select: { visiteur: true },
  });
  const v = visiteurDuFil(fil?.visiteur);
  if (!v || !reponse.trim()) return;

  await envoyerCourriel(
    courrielReponseVisiteur(v.email, {
      nom: v.nom,
      reponse,
      lien: await urlPublique("/"),
    }),
  );
}
