import "server-only";

// Support IT : les conversations avec l'Admin GM, avec photos, vidéos et PDF. Une pour l'équipe de chaque Chambre
// (bulle de l'espace admin, membreId vide) et une pour chaque membre qui écrit (page Support IT de l'espace membre,
// membreId : son compte). Côté Chambre et membre : lectures limitées à la Chambre (prisma) et au fil de celui qui
// lit ; côté Admin GM (page Messages) : toutes les Chambres (prismaSysteme).
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

// ——— Côté Chambre (équipe : membreId vide) et côté membre (membreId : son compte) ———

// Le fil de l'équipe d'une Chambre, ou celui d'un membre
const EQUIPE = "";

async function conversationCote(userId: string, membreId: string) {
  const fil = await prisma.filSupportIT.findFirst({
    where: { membreId },
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

export const supportITChambre = (userId: string) => conversationCote(userId, EQUIPE);
export const supportITMembre = (userId: string) => conversationCote(userId, userId);

async function lireCote(membreId: string): Promise<void> {
  await prisma.filSupportIT.updateMany({ where: { membreId }, data: { luChambreLe: new Date() } });
}
export const lireSupportITChambre = () => lireCote(EQUIPE);
export const lireSupportITMembre = (userId: string) => lireCote(userId);

async function ecrireCote(
  user: { id: string; nom: string },
  membreId: string,
  formData: FormData,
): Promise<ResultatEnvoi> {
  const envoi = await lireEnvoi(formData);
  if ("erreur" in envoi) return { ok: false, erreur: envoi.erreur };
  const chambre = await prisma.chambre.findFirstOrThrow({
    select: { id: true, nom: true },
  });

  const maintenant = new Date();
  const fil = await prisma.filSupportIT.upsert({
    where: { chambreId_membreId: { chambreId: chambre.id, membreId } },
    create: { chambreId: chambre.id, membreId },
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
      prevenirGM(chambre, membreId, user.nom, envoi.texte, envoi.pieces.length),
    );
  return { ok: true };
}

export const ecrireSupportITChambre = (user: { id: string; nom: string }, formData: FormData) =>
  ecrireCote(user, EQUIPE, formData);
export const ecrireSupportITMembre = (user: { id: string; nom: string }, formData: FormData) =>
  ecrireCote(user, user.id, formData);

// Le lien de l'Admin GM vers une conversation (celle de l'équipe, ou celle d'un membre)
const lienConversationGM = (chambreId: string, membreId: string) =>
  `/gm/messages?${new URLSearchParams({ c: chambreId, ...(membreId ? { m: membreId } : {}) })}`;

async function prevenirGM(
  chambre: { id: string; nom: string },
  membreId: string,
  auteur: string,
  texteMessage: string,
  pieces: number,
) {
  const extrait = texteMessage
    ? apercu(texteMessage, 300)
    : resumePieces(pieces);
  const comptes = await db.compteGM.findMany({ select: { email: true } });
  const lien = `${adresseGM()}${lienConversationGM(chambre.id, membreId)}`;
  const qui = membreId ? `${auteur} (membre de ${chambre.nom})` : `${auteur} (${chambre.nom})`;
  for (const c of comptes) {
    const { html, texte } = gabarit({
      titre: membreId ? `Support IT : un membre de ${chambre.nom}` : `Support IT : ${chambre.nom}`,
      paragraphes: [`${qui} a écrit :`, extrait],
      bouton: { libelle: "Répondre", url: lien },
    });
    await envoyerCourriel({
      a: c.email,
      sujet: membreId ? `Support IT : message d’un membre de ${chambre.nom}` : `Support IT : message de ${chambre.nom}`,
      html,
      texte,
      dePlateforme: true,
    }).catch(() => false);
  }
}

// La pièce jointe d'un message, si elle est du fil de l'équipe de cette Chambre, ou de celui de ce membre
export const pieceSupportITChambre = (id: string) =>
  prisma.pieceSupportIT.findFirst({
    where: { id, message: { fil: { membreId: EQUIPE } } },
    select: { nom: true, fichier: true },
  });
export const pieceSupportITMembre = (id: string, userId: string) =>
  prisma.pieceSupportIT.findFirst({
    where: { id, message: { fil: { membreId: userId } } },
    select: { nom: true, fichier: true },
  });

// ——— Côté Admin GM ———

// Le nom et l'entreprise des membres qui ont écrit
async function membresDesFils(ids: string[]) {
  if (!ids.length) return new Map<string, { nom: string; entreprise: string | null }>();
  const u = await db.user.findMany({ where: { id: { in: ids } }, select: { id: true, nom: true, member: { select: { nom: true } } } });
  return new Map(u.map((x) => [x.id, { nom: x.nom, entreprise: x.member?.nom ?? null }]));
}

const cleFil = (chambreId: string, membreId: string) => `${chambreId}|${membreId}`;

// Les conversations, la plus récente d'abord, avec leurs messages non lus (écrits par la Chambre ou le membre après
// la lecture)
export async function filsSupportGM() {
  const [fils, nonLus] = await Promise.all([
    db.filSupportIT.findMany({
      orderBy: { dernierLe: "desc" },
      select: {
        chambreId: true,
        membreId: true,
        dernierLe: true,
        chambre: { select: { nom: true, slug: true, profil: { select: { logo: true } } } },
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
    nonLusParFil(),
  ]);
  const membres = await membresDesFils(fils.map((f) => f.membreId).filter(Boolean));
  return fils.map((f) => {
    const dernier = f.messages[0];
    const membre = f.membreId ? membres.get(f.membreId) : null;
    return {
      chambreId: f.chambreId,
      membreId: f.membreId,
      nom: membre ? membre.nom : f.chambre.nom,
      sousTitre: membre ? `Membre${membre.entreprise ? ` · ${membre.entreprise}` : ""} · ${f.chambre.nom}` : f.chambre.slug,
      slug: f.chambre.slug,
      logo: membre ? null : (f.chambre.profil?.logo ?? null),
      le: f.dernierLe.toISOString(),
      apercu: dernier
        ? `${dernier.deGM ? "Vous : " : ""}${dernier.texte ? apercu(dernier.texte, 90) : resumePieces(dernier._count.pieces)}`
        : "",
      nonLus: nonLus.get(cleFil(f.chambreId, f.membreId)) ?? 0,
    };
  });
}

async function nonLusParFil(): Promise<Map<string, number>> {
  const lignes = await db.$queryRaw<{ chambre: string; membre: string; n: number }[]>`
    SELECT f."chambreId" AS chambre, f."membreId" AS membre, count(*)::int AS n
    FROM messages_support_it m
    JOIN fils_support_it f ON f.id = m."filId"
    WHERE NOT m."deGM" AND (f."luGMLe" IS NULL OR m."envoyeLe" > f."luGMLe")
    GROUP BY f."chambreId", f."membreId"`;
  return new Map(lignes.map((l) => [cleFil(l.chambre, l.membre), l.n]));
}

// Pour le menu de l'espace GM : messages des Chambres et des membres non lus
export async function nonLusSupportGM(): Promise<number> {
  let total = 0;
  for (const n of (await nonLusParFil()).values()) total += n;
  return total;
}

// La conversation avec l'équipe d'une Chambre, ou avec un de ses membres (vide si elle n'a pas encore commencé)
export async function conversationGM(chambreId: string, membreId = EQUIPE) {
  const [chambre, fil] = await Promise.all([
    db.chambre.findUnique({
      where: { id: chambreId },
      select: { id: true, nom: true, slug: true, profil: { select: { logo: true } } },
    }),
    db.filSupportIT.findUnique({
      where: { chambreId_membreId: { chambreId, membreId } },
      select: {
        luGMLe: true,
        messages: {
          orderBy: { envoyeLe: "desc" },
          take: DERNIERS,
          select: MESSAGE,
        },
      },
    }),
  ]);
  if (!chambre) return null;
  const membre = membreId ? (await membresDesFils([membreId])).get(membreId) : null;
  if (membreId && !membre) return null;
  const messages = (fil?.messages ?? []).reverse();
  const nonLus = messages.filter(
    (m) => !m.deGM && (!fil?.luGMLe || m.envoyeLe > fil.luGMLe),
  ).length;
  return {
    id: chambre.id,
    membreId,
    nom: membre ? membre.nom : chambre.nom,
    sousTitre: membre ? `Membre${membre.entreprise ? ` · ${membre.entreprise}` : ""} · ${chambre.nom}` : chambre.slug,
    slug: chambre.slug,
    logo: membre ? null : (chambre.profil?.logo ?? null),
    nonLus,
    messages: messages.map((m) => versMessage(m, "gm", null)),
  };
}

export async function lireSupportGM(chambreId: string, membreId = EQUIPE): Promise<void> {
  await db.filSupportIT.updateMany({
    where: { chambreId, membreId },
    data: { luGMLe: new Date() },
  });
}

export async function ecrireSupportGM(
  gm: { nom: string },
  chambreId: string,
  membreId: string,
  formData: FormData,
): Promise<ResultatEnvoi> {
  const chambre = await db.chambre.findUnique({
    where: { id: chambreId },
    select: { id: true },
  });
  if (!chambre) return { ok: false, erreur: "Cette Chambre n’existe plus." };
  if (membreId && !(await db.user.findFirst({ where: { id: membreId, chambreId }, select: { id: true } }))) {
    return { ok: false, erreur: "Ce membre n’existe plus." };
  }
  const envoi = await lireEnvoi(formData);
  if ("erreur" in envoi) return { ok: false, erreur: envoi.erreur };

  const maintenant = new Date();
  const fil = await db.filSupportIT.upsert({
    where: { chambreId_membreId: { chambreId, membreId } },
    create: { chambreId, membreId },
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

  // Ceux qui lisent ce fil : notification sur leurs appareils à chaque réponse ; courriel au premier message non lu.
  // Fil d'un membre : ce membre ; fil de l'équipe : ceux qui ont écrit (sinon les administrateurs de la Chambre)
  const extrait = envoi.texte
    ? apercu(envoi.texte, 300)
    : resumePieces(envoi.pieces.length);
  after(() =>
    avecChambre(chambreId, async () => {
      const auteurs = ecrits.map((e) => e.userId!).filter(Boolean);
      const destinataires = await prisma.user.findMany({
        where: membreId
          ? { id: membreId }
          : auteurs.length
            ? { id: { in: auteurs }, role: "admin" }
            : { role: "admin", niveauEquipe: "administrateur" },
        select: { id: true, email: true, nom: true },
      });
      const page = membreId ? "/membre/support-it" : "/admin";
      await notifier(
        destinataires.map((u) => u.id),
        {
          titre: "Support IT",
          corps: extrait,
          url: page,
          etiquette: "support-it",
        },
      ).catch(() => {});
      if (dejaEnAttente) return;
      const lien = await urlPublique(membreId ? page : "/admin?support=it");
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
          dePlateforme: true,
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
