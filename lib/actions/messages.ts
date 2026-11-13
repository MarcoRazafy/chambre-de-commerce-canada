"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { MOTIFS_CONTACT } from "@/lib/coordonnees";
import { prisma } from "@/lib/db";
import { prevenirVisiteur } from "@/lib/support-visiteur";
import { ecrireAEquipe } from "@/lib/fil-equipe";
import { redirectWithErreur, redirectWithFlash } from "@/lib/flash";
import { fmtMoney } from "@/lib/format";
import {
  LONGUEUR_NOM_GROUPE,
  MAX_CIBLES_TRANSFERT,
  MAX_PARTICIPANTS_GROUPE,
  critereJoignable,
} from "@/lib/messagerie";
import { getCurrentUser } from "@/lib/session";
import {
  PIECES_PAR_MESSAGE,
  PieceRefusee,
  copierPiece,
  effacerPiece,
  recevoirPiece,
} from "@/lib/stockage-messagerie";
import { fichiersRecus } from "@/lib/televersements";
import { ImageRefusee, enregistrerImage } from "@/lib/uploads";
import type { Space } from "@/lib/types";
import { apercu, notifier } from "@/lib/push";

const texte = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

const espace = (fd: FormData): "membre" | "admin" =>
  texte(fd, "space") === "admin" ? "admin" : "membre";

const lienFil = (space: Space, threadId: string) =>
  `/${space}/messagerie?t=${threadId}`;

async function prevenirParticipants(
  threadId: string,
  auteur: { id: string; nom: string },
  contenu: string,
  pieces: number,
) {
  const autres = await prisma.participantFil.findMany({
    where: { threadId, userId: { not: auteur.id } },
    select: { userId: true },
  });
  await notifier(
    autres.map((p) => p.userId),
    {
      titre: `Message de ${auteur.nom}`,
      corps: contenu
        ? apercu(contenu)
        : `${pieces} pièce${pieces > 1 ? "s" : ""} jointe${pieces > 1 ? "s" : ""}`,
      url: {
        membre: lienFil("membre", threadId),
        admin: lienFil("admin", threadId),
      },
      etiquette: `fil-${threadId}`,
    },
  );
}

async function participe(threadId: string, userId: string) {
  const p = await prisma.participantFil.findUnique({
    where: { threadId_userId: { threadId, userId } },
    select: { userId: true },
  });
  return Boolean(p);
}

async function filIndividuel(moi: string, autre: string): Promise<string> {
  const existant = await prisma.messageThread.findFirst({
    where: {
      type: "individuel",
      equipe: false,
      AND: [
        { participants: { some: { userId: moi } } },
        { participants: { some: { userId: autre } } },
      ],
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (existant) return existant.id;

  const fil = await prisma.messageThread.create({
    data: {
      type: "individuel",
      participants: {
        create: [{ userId: moi, luLe: new Date() }, { userId: autre }],
      },
    },
    select: { id: true },
  });
  return fil.id;
}

export async function sendMessage(formData: FormData) {
  const threadId = texte(formData, "threadId");
  const space = espace(formData);
  const contenu = texte(formData, "texte");
  const retour = lienFil(space, threadId);

  const user = await getCurrentUser(space);
  if (!(await participe(threadId, user.id))) {
    redirectWithErreur(
      `/${space}/messagerie`,
      "Vous ne participez pas à cette conversation.",
    );
  }

  const fichiers = await fichiersRecus(formData.getAll("pieces"));

  if (!contenu && fichiers.length === 0) {
    redirectWithErreur(retour, "Le message est vide.");
  }
  if (fichiers.length > PIECES_PAR_MESSAGE) {
    redirectWithErreur(
      retour,
      `${PIECES_PAR_MESSAGE} pièces jointes au plus par message.`,
    );
  }

  const pieces = [];
  try {
    for (const f of fichiers) {
      const recue = await recevoirPiece(f);
      if (recue) pieces.push(recue);
    }
  } catch (e) {
    if (e instanceof PieceRefusee) redirectWithErreur(retour, e.message);
    throw e;
  }

  const maintenant = new Date();
  await prisma.message.create({
    data: {
      threadId,
      auteur: user.nom,
      texte: contenu,
      sentAt: maintenant,
      userId: user.id,
      piecesJointes: { create: pieces },
    },
  });

  await prisma.participantFil.update({
    where: { threadId_userId: { threadId, userId: user.id } },
    data: { luLe: maintenant },
  });

  after(() => prevenirVisiteur(threadId, contenu));
  after(() => prevenirParticipants(threadId, user, contenu, pieces.length));

  revalidatePath("/", "layout");
  redirect(retour);
}

export async function modifierMessage(formData: FormData) {
  const space = espace(formData);
  const messageId = texte(formData, "messageId");
  const contenu = texte(formData, "texte");

  const user = await getCurrentUser(space);
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: {
      threadId: true,
      userId: true,
      texte: true,
      supprimeLe: true,
      _count: { select: { piecesJointes: true } },
    },
  });
  if (!message || message.userId !== user.id || message.supprimeLe) {
    redirectWithErreur(
      `/${space}/messagerie`,
      "Vous ne pouvez modifier que vos propres messages.",
    );
  }

  const retour = lienFil(space, message.threadId);
  if (contenu === message.texte) redirect(retour);
  if (!contenu && message._count.piecesJointes === 0) {
    redirectWithErreur(
      retour,
      "Un message ne peut pas être vide : supprimez-le plutôt.",
    );
  }

  await prisma.message.update({
    where: { id: messageId },
    data: { texte: contenu, modifieLe: new Date() },
  });

  revalidatePath("/", "layout");
  redirect(retour);
}

export async function supprimerMessage(formData: FormData) {
  const space = espace(formData);
  const messageId = texte(formData, "messageId");

  const user = await getCurrentUser(space);
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: {
      threadId: true,
      userId: true,
      supprimeLe: true,
      piecesJointes: { select: { fichier: true } },
    },
  });
  if (!message || message.userId !== user.id) {
    redirectWithErreur(
      `/${space}/messagerie`,
      "Vous ne pouvez supprimer que vos propres messages.",
    );
  }

  const retour = lienFil(space, message.threadId);
  if (message.supprimeLe) redirect(retour);

  await prisma.$transaction([
    prisma.pieceJointe.deleteMany({ where: { messageId } }),
    prisma.message.update({
      where: { id: messageId },
      data: { texte: "", supprimeLe: new Date(), modifieLe: null },
    }),
  ]);
  await Promise.all(message.piecesJointes.map((p) => effacerPiece(p.fichier)));

  revalidatePath("/", "layout");
  redirect(retour);
}

export async function transfererMessage(formData: FormData) {
  const space = espace(formData);
  const messageId = texte(formData, "messageId");
  const cibles = [...new Set(formData.getAll("cible").map(String))];

  const user = await getCurrentUser(space);
  const source = await prisma.message.findUnique({
    where: { id: messageId },
    include: { piecesJointes: { orderBy: { createdAt: "asc" } } },
  });
  if (
    !source ||
    source.supprimeLe ||
    !(await participe(source.threadId, user.id))
  ) {
    redirectWithErreur(
      `/${space}/messagerie`,
      "Ce message n’est plus disponible.",
    );
  }

  const retour = lienFil(space, source.threadId);
  if (cibles.length === 0) {
    redirectWithErreur(retour, "Choisissez au moins une conversation.");
  }
  if (cibles.length > MAX_CIBLES_TRANSFERT) {
    redirectWithErreur(
      retour,
      `${MAX_CIBLES_TRANSFERT} conversations au plus par transfert.`,
    );
  }

  const fils = cibles
    .filter((c) => c.startsWith("fil:"))
    .map((c) => c.slice(4));
  const personnes = cibles
    .filter((c) => c.startsWith("personne:"))
    .map((c) => c.slice(9));

  const vises = new Set<string>();
  if (fils.length) {
    const miens = await prisma.participantFil.findMany({
      where: { userId: user.id, threadId: { in: fils } },
      select: { threadId: true },
    });
    miens.forEach((p) => vises.add(p.threadId));
  }
  if (personnes.length) {
    const joignables = await prisma.user.findMany({
      where: { AND: [critereJoignable(user.id), { id: { in: personnes } }] },
      select: { id: true },
    });
    for (const p of joignables) vises.add(await filIndividuel(user.id, p.id));
  }
  if (vises.size === 0) {
    redirectWithErreur(
      retour,
      "Aucune des conversations choisies n’est accessible.",
    );
  }

  const maintenant = new Date();
  for (const threadId of vises) {
    const pieces = [];
    for (const p of source.piecesJointes) {
      pieces.push({
        nom: p.nom,
        type: p.type,
        taille: p.taille,
        fichier: await copierPiece(p.fichier),
      });
    }
    await prisma.message.create({
      data: {
        threadId,
        auteur: user.nom,
        userId: user.id,
        texte: source.texte,
        sentAt: maintenant,
        transfere: true,
        piecesJointes: { create: pieces },
      },
    });
  }
  await prisma.participantFil.updateMany({
    where: { userId: user.id, threadId: { in: [...vises] } },
    data: { luLe: maintenant },
  });

  revalidatePath("/", "layout");
  if (vises.size === 1) redirect(lienFil(space, [...vises][0]));
  redirectWithFlash(
    retour,
    `Message transféré dans ${vises.size} conversations.`,
  );
}

async function personnesValides(fd: FormData, userId: string) {
  const ids = [...new Set(fd.getAll("participant").map(String))];
  if (ids.length === 0) return [];
  return prisma.user.findMany({
    where: { AND: [critereJoignable(userId), { id: { in: ids } }] },
    select: { id: true },
  });
}

const GROUPES_RESERVES =
  "Seule l’équipe CanCham peut créer un groupe ou y ajouter quelqu’un.";

export async function creerGroupe(formData: FormData) {
  const space = espace(formData);
  const base = `/${space}/messagerie`;
  const user = await getCurrentUser(space);
  if (user.role !== "admin") redirectWithErreur(base, GROUPES_RESERVES);
  const nom = texte(formData, "nom");

  if (!nom) redirectWithErreur(base, "Donnez un nom au groupe.");
  if (nom.length > LONGUEUR_NOM_GROUPE) {
    redirectWithErreur(
      base,
      `Le nom du groupe dépasse ${LONGUEUR_NOM_GROUPE} caractères.`,
    );
  }

  const invites = await personnesValides(formData, user.id);
  if (invites.length === 0) {
    redirectWithErreur(base, "Ajoutez au moins une personne au groupe.");
  }
  if (invites.length + 1 > MAX_PARTICIPANTS_GROUPE) {
    redirectWithErreur(
      base,
      `Un groupe compte ${MAX_PARTICIPANTS_GROUPE} participants au plus.`,
    );
  }

  let avatar: string | null = null;
  try {
    avatar = await enregistrerImage(formData.get("photo"), {
      prefixe: "groupe",
      largeur: 480,
    });
  } catch (e) {
    if (e instanceof ImageRefusee) redirectWithErreur(base, e.message);
    throw e;
  }

  const fil = await prisma.messageThread.create({
    data: {
      type: "groupe",
      nom,
      avatar,
      participants: {
        create: [
          { userId: user.id, luLe: new Date() },
          ...invites.map((i) => ({ userId: i.id })),
        ],
      },
    },
    select: { id: true },
  });

  revalidatePath("/", "layout");
  redirect(lienFil(space, fil.id));
}

export async function ajouterParticipants(formData: FormData) {
  const space = espace(formData);
  const threadId = texte(formData, "threadId");
  const retour = lienFil(space, threadId);

  const user = await getCurrentUser(space);
  if (user.role !== "admin") redirectWithErreur(retour, GROUPES_RESERVES);
  const fil = await prisma.messageThread.findUnique({
    where: { id: threadId },
    select: { type: true, _count: { select: { participants: true } } },
  });
  if (fil?.type !== "groupe" || !(await participe(threadId, user.id))) {
    redirectWithErreur(
      `/${space}/messagerie`,
      "Seuls les participants d’un groupe peuvent y ajouter quelqu’un.",
    );
  }

  const invites = await personnesValides(formData, user.id);
  if (invites.length === 0) {
    redirectWithErreur(retour, "Choisissez au moins une personne.");
  }
  if (fil._count.participants + invites.length > MAX_PARTICIPANTS_GROUPE) {
    redirectWithErreur(
      retour,
      `Un groupe compte ${MAX_PARTICIPANTS_GROUPE} participants au plus.`,
    );
  }

  const { count } = await prisma.participantFil.createMany({
    data: invites.map((i) => ({ threadId, userId: i.id })),
    skipDuplicates: true,
  });

  revalidatePath("/", "layout");
  redirectWithFlash(
    retour,
    count === 0
      ? "Ces personnes font déjà partie du groupe."
      : `${count} personne${count > 1 ? "s" : ""} ajoutée${count > 1 ? "s" : ""} au groupe.`,
  );
}

export async function quitterGroupe(formData: FormData) {
  const space = espace(formData);
  const threadId = texte(formData, "threadId");
  const base = `/${space}/messagerie`;

  const user = await getCurrentUser(space);
  const fil = await prisma.messageThread.findUnique({
    where: { id: threadId },
    select: { type: true, nom: true },
  });
  if (fil?.type !== "groupe" || !(await participe(threadId, user.id))) {
    redirectWithErreur(base, "Vous ne faites pas partie de ce groupe.");
  }

  await prisma.participantFil.delete({
    where: { threadId_userId: { threadId, userId: user.id } },
  });

  const restants = await prisma.participantFil.count({ where: { threadId } });
  if (restants === 0) {
    const pieces = await prisma.pieceJointe.findMany({
      where: { message: { threadId } },
      select: { fichier: true },
    });
    await prisma.messageThread.delete({ where: { id: threadId } });
    await Promise.all(pieces.map((p) => effacerPiece(p.fichier)));
  }

  revalidatePath("/", "layout");
  redirectWithFlash(base, `Vous avez quitté « ${fil.nom ?? "le groupe"} ».`);
}

export async function markThreadRead(threadId: string, space: Space) {
  const user = await getCurrentUser(space === "admin" ? "admin" : "membre");
  const { count } = await prisma.participantFil.updateMany({
    where: { threadId, userId: user.id },
    data: { luLe: new Date() },
  });
  if (count) revalidatePath("/", "layout");
}

export async function ouvrirConversation(formData: FormData) {
  const memberId = texte(formData, "memberId");
  const space = espace(formData);
  const user = await getCurrentUser(space);

  const existant = await prisma.messageThread.findFirst({
    where: {
      type: "individuel",
      equipe: false,
      AND: [
        { participants: { some: { userId: user.id } } },
        {
          participants: {
            some: { userId: { not: user.id }, user: { memberId } },
          },
        },
      ],
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (existant) redirect(lienFil(space, existant.id));

  const referent = await prisma.user.findFirst({
    where:
      space === "admin"
        ? { memberId, role: { in: ["membre" as const, "visiteur" as const] } }
        : { AND: [critereJoignable(user.id), { memberId }] },
    orderBy: [{ contactPrincipal: "desc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  if (!referent) {
    redirectWithErreur(
      space === "admin"
        ? `/admin/membres/${memberId}`
        : `/membre/annuaire/${memberId}`,
      "Cette entreprise n’a pas encore de contact joignable par la messagerie.",
    );
  }

  const threadId = await filIndividuel(user.id, referent.id);
  revalidatePath("/", "layout");
  redirect(lienFil(space, threadId));
}

export async function envoyerDemandeContact(formData: FormData) {
  const motif = texte(formData, "motif");
  const sujet = texte(formData, "sujet");
  const contenu = texte(formData, "message");
  const rappel = texte(formData, "rappel");

  if (!sujet || !contenu) {
    redirectWithErreur(
      "/membre/contact",
      "Merci d’indiquer un sujet et un message.",
    );
  }

  const user = await getCurrentUser("membre");

  const motifRetenu = (MOTIFS_CONTACT as readonly string[]).includes(motif)
    ? motif
    : "Autre demande";

  const fil = await ecrireAEquipe(
    user,
    [
      `${motifRetenu} — ${sujet}`,
      contenu,
      rappel ? `Rappel souhaité au ${rappel}.` : null,
    ]
      .filter(Boolean)
      .join("\n\n"),
  );

  revalidatePath("/", "layout");
  redirect(`/membre/contact?envoye=${fil}`);
}

export async function reserverService(formData: FormData) {
  const retour = "/membre/offres-cancham";
  const service = await prisma.canchamService.findUnique({
    where: { id: texte(formData, "serviceId") },
    select: { id: true, titre: true, type: true, prix: true },
  });
  if (!service) {
    redirectWithErreur(retour, "Ce service n’est plus proposé.");
  }

  const user = await getCurrentUser("membre");
  const entreprise = user.memberId
    ? (
        await prisma.member.findUnique({
          where: { id: user.memberId },
          select: { nom: true },
        })
      )?.nom
    : null;
  const signature = [user.nom, entreprise].filter(Boolean).join(" · ");
  const payant = service.type === "payant";
  const prix = fmtMoney(service.prix);

  const fil = await ecrireAEquipe(
    user,
    (payant
      ? [
          `Paiement — ${service.titre}`,
          `Bonjour, je souhaite régler « ${service.titre} » (${prix}). Pouvez-vous m’indiquer les modalités de paiement et la suite à donner ?`,
          signature,
        ]
      : [
          `Réservation — ${service.titre}`,
          `Bonjour, je souhaite réserver « ${service.titre} », inclus dans mon adhésion. Pouvez-vous m’indiquer les disponibilités et la suite à donner ?`,
          signature,
        ]
    ).join("\n\n"),
  );

  await prisma.auditLog.create({
    data: {
      action: payant ? "service_reserve" : "service_gratuit_reserve",
      entite: "MessageThread",
      entiteId: fil,
      acteur: user.nom,
      detail: `« ${service.titre} »${payant ? ` · ${prix}` : ""}${entreprise ? ` · ${entreprise}` : ""}.`,
    },
  });

  revalidatePath("/", "layout");
  redirectWithFlash(
    retour,
    `${payant ? "Demande de paiement" : "Demande de réservation"} envoyée à l’équipe CanCham · réponse dans votre messagerie`,
  );
}

// Bulle de l'espace membre : le membre écrit à l'équipe de sa Chambre
// (l'espace admin a la sienne : Support IT, /api/support-it)
export async function ecrireAuSupport(
  _espace: string,
  _threadId: string | null,
  contenuBrut: string,
): Promise<{ ok: true; threadId: string } | { ok: false; erreur: string }> {
  const contenu = String(contenuBrut ?? "").trim();
  if (!contenu) return { ok: false, erreur: "Le message est vide." };
  const user = await getCurrentUser("membre");
  const fil = await ecrireAEquipe(user, contenu);
  revalidatePath("/", "layout");
  return { ok: true, threadId: fil };
}
