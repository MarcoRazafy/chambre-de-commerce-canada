import "server-only";

// Support IT : la conversation de l'équipe d'une Chambre avec l'Admin GM (une par Chambre), avec photos, vidéos
// et PDF. Côté Chambre (bulle de l'espace admin) : lectures limitées à la Chambre (prisma) ; côté Admin GM
// (page Messages) : toutes les Chambres (prismaSysteme).
import { after } from "next/server";
import { avecChambre } from "@/lib/chambre-courante";
import { envoyerCourriel, gabarit, urlPublique } from "@/lib/courriel";
import { prisma, prismaSysteme as db } from "@/lib/db";
import { apercu, notifier } from "@/lib/push";
import {
  effacerPiece,
  PIECES_PAR_MESSAGE,
  PieceRefusee,
  recevoirPiece,
  type PieceRecue,
} from "@/lib/stockage-messagerie";
import type { MessageSupport } from "@/lib/support";
import { adresseGM } from "@/lib/visite-gm";

const DERNIERS = 80;

const MESSAGE = {
  id: true,
  deGM: true,
  auteur: true,
  userId: true,
  texte: true,
  envoyeLe: true,
  pieces: {
    orderBy: { createdAt: "asc" },
    select: { id: true, nom: true, type: true, taille: true },
  },
} as const;

type Ligne = {
  id: string;
  deGM: boolean;
  auteur: string;
  userId: string | null;
  texte: string;
  envoyeLe: Date;
  pieces: {
    id: string;
    nom: string;
    type: "image" | "video" | "pdf";
    taille: number;
  }[];
};

// « moi » : écrit par ce compte ; « equipe » : écrit par l'autre côté (l'Admin GM pour la Chambre, la Chambre
// pour l'Admin GM)
const versMessage = (
  m: Ligne,
  cote: "chambre" | "gm",
  moi: string | null,
): MessageSupport => ({
  id: m.id,
  de: m.auteur,
  moi: cote === "chambre" ? !m.deGM && m.userId === moi : m.deGM,
  equipe: cote === "chambre" ? m.deGM : !m.deGM,
  texte: m.texte,
  envoyeLe: m.envoyeLe.toISOString(),
  supprime: false,
  pieces: m.pieces,
});

const resumePieces = (n: number) =>
  `${n} pièce${n > 1 ? "s" : ""} jointe${n > 1 ? "s" : ""}`;

// Pièces reçues d'un formulaire : 5 au plus, images, vidéos ou PDF (PieceRefusee sinon, rien n'est gardé)
async function recevoirPieces(
  entrees: FormDataEntryValue[],
): Promise<PieceRecue[]> {
  const fichiers = entrees.filter(
    (e): e is File => e instanceof File && e.size > 0,
  );
  if (fichiers.length > PIECES_PAR_MESSAGE)
    throw new PieceRefusee(
      `${PIECES_PAR_MESSAGE} pièces jointes au plus par message.`,
    );
  const recues: PieceRecue[] = [];
  try {
    for (const f of fichiers) {
      const r = await recevoirPiece(f);
      if (r) recues.push(r);
    }
  } catch (e) {
    await Promise.all(recues.map((r) => effacerPiece(r.fichier)));
    throw e;
  }
  return recues;
}

export type ResultatEnvoi = { ok: true } | { ok: false; erreur: string };

async function lireEnvoi(
  formData: FormData,
): Promise<{ texte: string; pieces: PieceRecue[] } | { erreur: string }> {
  const texte = String(formData.get("texte") ?? "").trim();
  if (texte.length > 5_000)
    return { erreur: "Le message est trop long (5 000 caractères au plus)." };
  let pieces: PieceRecue[];
  try {
    pieces = await recevoirPieces(formData.getAll("pieces"));
  } catch (e) {
    if (e instanceof PieceRefusee) return { erreur: e.message };
    throw e;
  }
  if (!texte && !pieces.length) return { erreur: "Le message est vide." };
  return { texte, pieces };
}

// ——— Côté Chambre (espace admin) ———

export async function supportITChambre(userId: string) {
  const fil = await prisma.filSupportIT.findFirst({
    select: {
      id: true,
      luChambreLe: true,
      messages: {
        orderBy: { envoyeLe: "desc" },
        take: DERNIERS,
        select: MESSAGE,
      },
    },
  });
  if (!fil) return { conversation: null, nonLus: 0 };
  const nonLus = await prisma.messageSupportIT.count({
    where: {
      filId: fil.id,
      deGM: true,
      ...(fil.luChambreLe ? { envoyeLe: { gt: fil.luChambreLe } } : {}),
    },
  });
  return {
    nonLus,
    conversation: {
      id: fil.id,
      nom: "Support IT",
      sousTitre: "L’Alliée Virtuelle",
      avatar: null,
      init: "IT",
      membreId: null,
      nonLus,
      messages: fil.messages
        .reverse()
        .map((m) => versMessage(m, "chambre", userId)),
    },
  };
}

export async function lireSupportITChambre(): Promise<void> {
  await prisma.filSupportIT.updateMany({ data: { luChambreLe: new Date() } });
}

export async function ecrireSupportITChambre(
  user: { id: string; nom: string },
  formData: FormData,
): Promise<ResultatEnvoi> {
  const envoi = await lireEnvoi(formData);
  if ("erreur" in envoi) return { ok: false, erreur: envoi.erreur };
  const chambre = await prisma.chambre.findFirstOrThrow({
    select: { id: true, nom: true },
  });

  const maintenant = new Date();
  const fil = await prisma.filSupportIT.upsert({
    where: { chambreId: chambre.id },
    create: { chambreId: chambre.id },
    update: {},
    select: { id: true, luGMLe: true },
  });
  // Courriel à l'Admin GM au premier message non lu seulement (pas à chaque message d'une même conversation)
  const dejaEnAttente = await prisma.messageSupportIT.count({
    where: {
      filId: fil.id,
      deGM: false,
      ...(fil.luGMLe ? { envoyeLe: { gt: fil.luGMLe } } : {}),
    },
  });
  await prisma.messageSupportIT.create({
    data: {
      filId: fil.id,
      auteur: user.nom,
      userId: user.id,
      texte: envoi.texte,
      envoyeLe: maintenant,
      pieces: { create: envoi.pieces },
    },
  });
  await prisma.filSupportIT.update({
    where: { id: fil.id },
    data: { dernierLe: maintenant, luChambreLe: maintenant },
  });

  if (!dejaEnAttente)
    after(() =>
      prevenirGM(chambre, user.nom, envoi.texte, envoi.pieces.length),
    );
  return { ok: true };
}

async function prevenirGM(
  chambre: { id: string; nom: string },
  auteur: string,
  texteMessage: string,
  pieces: number,
) {
  const extrait = texteMessage
    ? apercu(texteMessage, 300)
    : resumePieces(pieces);
  const comptes = await db.compteGM.findMany({ select: { email: true } });
  const lien = `${adresseGM()}/gm/messages?c=${encodeURIComponent(chambre.id)}`;
  for (const c of comptes) {
    const { html, texte } = gabarit({
      titre: `Support IT : ${chambre.nom}`,
      paragraphes: [`${auteur} (${chambre.nom}) a écrit :`, extrait],
      bouton: { libelle: "Répondre", url: lien },
    });
    await envoyerCourriel({
      a: c.email,
      sujet: `Support IT : message de ${chambre.nom}`,
      html,
      texte,
    }).catch(() => false);
  }
}

// La pièce jointe d'un message, si elle est de cette Chambre
export const pieceSupportITChambre = (id: string) =>
  prisma.pieceSupportIT.findFirst({
    where: { id },
    select: { nom: true, fichier: true },
  });

// ——— Côté Admin GM ———

// Les conversations, la plus récente d'abord, avec leurs messages non lus (écrits par la Chambre après la lecture)
export async function filsSupportGM() {
  const [fils, nonLus] = await Promise.all([
    db.filSupportIT.findMany({
      orderBy: { dernierLe: "desc" },
      select: {
        chambreId: true,
        dernierLe: true,
        chambre: { select: { nom: true, slug: true } },
        messages: {
          orderBy: { envoyeLe: "desc" },
          take: 1,
          select: {
            texte: true,
            deGM: true,
            _count: { select: { pieces: true } },
          },
        },
      },
    }),
    nonLusParChambre(),
  ]);
  return fils.map((f) => {
    const dernier = f.messages[0];
    return {
      chambreId: f.chambreId,
      nom: f.chambre.nom,
      slug: f.chambre.slug,
      le: f.dernierLe.toISOString(),
      apercu: dernier
        ? `${dernier.deGM ? "Vous : " : ""}${dernier.texte ? apercu(dernier.texte, 90) : resumePieces(dernier._count.pieces)}`
        : "",
      nonLus: nonLus.get(f.chambreId) ?? 0,
    };
  });
}

async function nonLusParChambre(): Promise<Map<string, number>> {
  const lignes = await db.$queryRaw<{ chambre: string; n: number }[]>`
    SELECT f."chambreId" AS chambre, count(*)::int AS n
    FROM messages_support_it m
    JOIN fils_support_it f ON f.id = m."filId"
    WHERE NOT m."deGM" AND (f."luGMLe" IS NULL OR m."envoyeLe" > f."luGMLe")
    GROUP BY f."chambreId"`;
  return new Map(lignes.map((l) => [l.chambre, l.n]));
}

// Pour le menu de l'espace GM : messages des Chambres non lus
export async function nonLusSupportGM(): Promise<number> {
  let total = 0;
  for (const n of (await nonLusParChambre()).values()) total += n;
  return total;
}

// La conversation avec une Chambre (vide si elle n'a pas encore commencé)
export async function conversationGM(chambreId: string) {
  const chambre = await db.chambre.findUnique({
    where: { id: chambreId },
    select: {
      id: true,
      nom: true,
      slug: true,
      filSupportIT: {
        select: {
          luGMLe: true,
          messages: {
            orderBy: { envoyeLe: "desc" },
            take: DERNIERS,
            select: MESSAGE,
          },
        },
      },
    },
  });
  if (!chambre) return null;
  const fil = chambre.filSupportIT;
  const messages = (fil?.messages ?? []).reverse();
  const nonLus = messages.filter(
    (m) => !m.deGM && (!fil?.luGMLe || m.envoyeLe > fil.luGMLe),
  ).length;
  return {
    id: chambre.id,
    nom: chambre.nom,
    slug: chambre.slug,
    nonLus,
    messages: messages.map((m) => versMessage(m, "gm", null)),
  };
}

export async function lireSupportGM(chambreId: string): Promise<void> {
  await db.filSupportIT.updateMany({
    where: { chambreId },
    data: { luGMLe: new Date() },
  });
}

export async function ecrireSupportGM(
  gm: { nom: string },
  chambreId: string,
  formData: FormData,
): Promise<ResultatEnvoi> {
  const chambre = await db.chambre.findUnique({
    where: { id: chambreId },
    select: { id: true },
  });
  if (!chambre) return { ok: false, erreur: "Cette Chambre n’existe plus." };
  const envoi = await lireEnvoi(formData);
  if ("erreur" in envoi) return { ok: false, erreur: envoi.erreur };

  const maintenant = new Date();
  const fil = await db.filSupportIT.upsert({
    where: { chambreId },
    create: { chambreId },
    update: {},
    select: { id: true, luChambreLe: true },
  });
  const dejaEnAttente = await db.messageSupportIT.count({
    where: {
      filId: fil.id,
      deGM: true,
      ...(fil.luChambreLe ? { envoyeLe: { gt: fil.luChambreLe } } : {}),
    },
  });
  const ecrits = await db.messageSupportIT.findMany({
    where: { filId: fil.id, deGM: false, userId: { not: null } },
    distinct: ["userId"],
    select: { userId: true },
  });
  await db.messageSupportIT.create({
    data: {
      filId: fil.id,
      deGM: true,
      auteur: gm.nom,
      texte: envoi.texte,
      envoyeLe: maintenant,
      pieces: { create: envoi.pieces },
    },
  });
  await db.filSupportIT.update({
    where: { id: fil.id },
    data: { dernierLe: maintenant, luGMLe: maintenant },
  });

  // L'équipe de la Chambre : notification sur ses appareils à chaque réponse ; courriel au premier message non lu,
  // à ceux qui ont écrit (sinon aux administrateurs)
  const extrait = envoi.texte
    ? apercu(envoi.texte, 300)
    : resumePieces(envoi.pieces.length);
  after(() =>
    avecChambre(chambreId, async () => {
      const auteurs = ecrits.map((e) => e.userId!).filter(Boolean);
      const destinataires = await prisma.user.findMany({
        where: auteurs.length
          ? { id: { in: auteurs }, role: "admin" }
          : { role: "admin", niveauEquipe: "administrateur" },
        select: { id: true, email: true, nom: true },
      });
      await notifier(
        destinataires.map((u) => u.id),
        {
          titre: "Support IT",
          corps: extrait,
          url: "/admin",
          etiquette: "support-it",
        },
      ).catch(() => {});
      if (dejaEnAttente) return;
      const lien = await urlPublique("/admin?support=it");
      for (const u of destinataires) {
        const { html, texte } = gabarit({
          titre: "Réponse du Support IT",
          paragraphes: [
            `Bonjour ${u.nom.split(/\s+/)[0] ?? ""},`,
            `${gm.nom} (Support IT) vous a répondu :`,
            extrait,
          ],
          bouton: { libelle: "Lire la réponse", url: lien },
        });
        await envoyerCourriel({
          a: u.email,
          sujet: "Réponse du Support IT",
          html,
          texte,
        }).catch(() => false);
      }
    }),
  );
  return { ok: true };
}

export const pieceSupportITGM = (id: string) =>
  db.pieceSupportIT.findUnique({
    where: { id },
    select: { nom: true, fichier: true },
  });

// Les Chambres, pour ouvrir une conversation avec l'une d'elles
export const chambresSupportGM = () =>
  db.chambre.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } });
