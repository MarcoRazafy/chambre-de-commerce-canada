"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { espaceDe, estHeure, estJourISO, plageHoraire } from "@/lib/agenda";
import { exigerEquipe } from "@/lib/autorisations";
import { envoyerCourriel, urlPublique } from "@/lib/courriel";
import { courrielEquipe } from "@/lib/parametres";
import { prisma } from "@/lib/db";
import { toISODate } from "@/lib/enums";
import { redirectWithErreur, redirectWithFlash } from "@/lib/flash";
import { aujourdhuiISO, fmtDate, jourBase } from "@/lib/format";
import {
  courrielRendezvousAnnule,
  courrielRendezvousConfirme,
  courrielRendezvousEquipe,
  courrielRendezvousPris,
} from "@/lib/modeles-courriels";
import { invitationIcs } from "@/lib/ics";
import { maintenant } from "@/lib/presences";
import {
  chevauche,
  COULEURS_TYPE,
  creneauxLibres,
  FUSEAU_CHAMBRE,
  finCreneau,
  JOURS_SEMAINE,
  libelleLieu,
  lireLieu,
  type Plage,
} from "@/lib/rendezvous";
import { getCurrentUser } from "@/lib/session";
import { notifier, notifierEquipe } from "@/lib/push";

const texte = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const nombre = (fd: FormData, k: string) => Number(texte(fd, k));

const MEMBRE = "/membre/rendez-vous";
const EQUIPE = "/admin/rendez-vous";

const MOTIF_MAX = 500;
const TITRE_MAX = 80;
const DETAIL_MAX = 200;
const DUREE_MIN = 10;
const DUREE_MAX = 240;
const PRIX_MAX = 60;

function revalider() {
  revalidatePath(MEMBRE);
  revalidatePath(EQUIPE);
  revalidatePath("/membre/agenda");
  revalidatePath("/admin/agenda");
}

const jourLong = (iso: string) =>
  fmtDate(iso, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

type RendezvousAnnonce = {
  id: string;
  jour: Date;
  debut: string;
  fin: string;
  motif: string | null;
  lieu: string;
  lienVisio: string | null;
  statut: string;
  type: { titre: string };
  user: { nom: string };
  member: { nom: string } | null;
  hote: { nom: string; email: string } | null;
};

const SELECTION = {
  id: true,
  userId: true,
  jour: true,
  debut: true,
  fin: true,
  motif: true,
  lieu: true,
  lienVisio: true,
  statut: true,
  annuleLe: true,
  type: { select: { titre: true } },
  user: { select: { nom: true, email: true } },
  member: { select: { nom: true } },
  hote: { select: { nom: true, email: true } },
} as const;

// L'invitation de calendrier d'un rendez-vous (annulation : la même, marquée annulée)
function ics(r: RendezvousAnnonce, annule = false) {
  const jour = toISODate(r.jour);
  const lieu = libelleLieu(r.lieu);
  return invitationIcs({
    uid: r.id,
    debut: new Date(`${jour}T${r.debut}:00${FUSEAU_CHAMBRE}`),
    fin: new Date(`${jour}T${r.fin}:00${FUSEAU_CHAMBRE}`),
    titre: `${r.type.titre} — CanCham`,
    description: [r.hote ? `Avec ${r.hote.nom}` : "Avec l’équipe CanCham", r.motif].filter(Boolean).join("\n"),
    lieu: r.lienVisio ?? lieu.libelle,
    url: r.lienVisio,
    annule,
  });
}

async function annonce(r: RendezvousAnnonce) {
  const jour = toISODate(r.jour);
  return {
    type: r.type.titre,
    jour: jourLong(jour),
    horaire: plageHoraire(r.debut, r.fin) ?? r.debut,
    personne: r.user.nom,
    entreprise: r.member?.nom ?? null,
    motif: r.motif,
    lien: await urlPublique(MEMBRE),
    avec: r.hote?.nom ?? null,
    lieu: libelleLieu(r.lieu).libelle,
    lienVisio: r.lienVisio,
    aConfirmer: r.statut === "a_confirmer",
  };
}

export async function reserverRendezvous(formData: FormData) {
  const user = await getCurrentUser("membre");
  const jour = texte(formData, "jour");
  const debut = texte(formData, "debut");
  const motif = texte(formData, "motif").slice(0, MOTIF_MAX);
  const typeId = texte(formData, "typeId");
  const retour = `${MEMBRE}?type=${encodeURIComponent(typeId)}`;

  if (!estJourISO(jour) || !estHeure(debut)) {
    redirectWithErreur(retour, "Choisissez un jour et une heure.");
  }
  if (jour < aujourdhuiISO()) {
    redirectWithErreur(retour, "Ce créneau est passé.");
  }

  const type = await prisma.typeRendezvous.findUnique({
    where: { id: typeId },
    select: {
      id: true, titre: true, duree: true, actif: true, hoteId: true, lieu: true, aConfirmer: true,
      hote: { select: { recoitRdv: true, lienVisio: true } },
    },
  });
  if (!type || !type.actif || (type.hote && !type.hote.recoitRdv)) {
    redirectWithErreur(MEMBRE, "Ce type de rendez-vous n’est plus proposé.");
  }

  // Les créneaux pris de la même personne (chacun a son agenda)
  const [plages, pris] = await Promise.all([
    prisma.disponibilite.findMany({
      where: { typeId: type.id },
      select: { jour: true, debut: true, fin: true },
    }),
    prisma.rendezvous.findMany({
      where: { jour: jourBase(jour), annuleLe: null, hoteId: type.hoteId },
      select: { debut: true, fin: true },
    }),
  ]);
  const libres = creneauxLibres({
    jour,
    plages,
    duree: type.duree,
    occupes: pris,
    maintenant: maintenant(),
  });
  if (!libres.includes(debut)) {
    redirectWithErreur(
      retour,
      "Ce créneau n’est plus disponible. Choisissez-en un autre.",
    );
  }

  const lieu = lireLieu(type.lieu);
  let rendezvous;
  try {
    rendezvous = await prisma.rendezvous.create({
      data: {
        typeId: type.id,
        userId: user.id,
        memberId: user.memberId,
        jour: jourBase(jour),
        debut,
        fin: finCreneau(debut, type.duree),
        motif: motif || null,
        hoteId: type.hoteId,
        lieu,
        lienVisio: lieu === "visio" ? (type.hote?.lienVisio ?? null) : null,
        statut: type.aConfirmer ? "a_confirmer" : "confirme",
      },
      select: SELECTION,
    });
  } catch (e) {
    if ((e as { code?: string }).code !== "P2002") throw e;
    redirectWithErreur(
      retour,
      "Quelqu’un vient de prendre ce créneau. Choisissez-en un autre.",
    );
  }

  const details = await annonce(rendezvous);
  const invitation = ics(rendezvous);
  const destinatairesEquipe = [...new Set([await courrielEquipe(), rendezvous.hote?.email].filter((x): x is string => !!x))];
  after(async () => {
    await notifierEquipe({
      titre: details.aConfirmer ? "Rendez-vous à confirmer" : "Rendez-vous pris",
      corps: `${details.type} · ${details.jour}, ${details.horaire} · ${rendezvous.user.nom}${details.entreprise ? ` (${details.entreprise})` : ""}`,
      url: EQUIPE,
    });
    await envoyerCourriel(
      courrielRendezvousPris(rendezvous.user.email, { ...details, ics: invitation }),
    );
    for (const a of destinatairesEquipe) {
      await envoyerCourriel(
        courrielRendezvousEquipe(a, { ...details, ics: invitation, lien: await urlPublique(EQUIPE) }),
      );
    }
  });

  await prisma.auditLog.create({
    data: {
      action: "rendezvous_pris",
      entite: "Rendezvous",
      entiteId: rendezvous.id,
      acteur: user.nom,
      detail: `« ${details.type} » le ${details.jour}, ${details.horaire}${
        details.avec ? ` · avec ${details.avec}` : ""
      }${details.entreprise ? ` · ${details.entreprise}` : ""}${details.aConfirmer ? " · à confirmer" : ""}.`,
    },
  });

  revalider();
  redirectWithFlash(
    `${MEMBRE}?ok=${rendezvous.id}`,
    details.aConfirmer
      ? `Demande enregistrée — ${details.jour}, ${details.horaire}`
      : `Rendez-vous confirmé — ${details.jour}, ${details.horaire}`,
  );
}

// L'équipe confirme une demande de rendez-vous : le membre reçoit la confirmation et l'invitation d'agenda
export async function confirmerRendezvous(formData: FormData) {
  const moi = await exigerEquipe();
  const retour = texte(formData, "retour").startsWith("/admin") ? texte(formData, "retour") : EQUIPE;
  const id = texte(formData, "rendezvousId");
  const { count } = await prisma.rendezvous.updateMany({
    where: { id, statut: "a_confirmer", annuleLe: null },
    data: { statut: "confirme", confirmeLe: new Date() },
  });
  if (!count) redirectWithErreur(retour, "Ce rendez-vous n’est plus à confirmer.");
  const r = await prisma.rendezvous.findUniqueOrThrow({ where: { id }, select: SELECTION });
  const details = await annonce(r);
  after(async () => {
    await notifier([r.userId], {
      titre: "Rendez-vous confirmé",
      corps: `${details.type} · ${details.jour}, ${details.horaire}`,
      url: MEMBRE,
    });
    await envoyerCourriel(courrielRendezvousConfirme(r.user.email, { ...details, ics: ics(r) }));
  });
  await prisma.auditLog.create({
    data: {
      action: "rendezvous_confirme",
      entite: "Rendezvous",
      entiteId: id,
      acteur: moi.nom,
      detail: `« ${details.type} » du ${details.jour}, ${details.horaire} · ${r.user.nom}${details.entreprise ? ` (${details.entreprise})` : ""}.`,
    },
  });
  revalider();
  redirectWithFlash(retour, `Rendez-vous confirmé : ${r.user.nom} est prévenu(e)`);
}

export async function annulerRendezvous(formData: FormData) {
  const demande = texte(formData, "retour");
  const page = demande.startsWith("/admin") ? (demande.startsWith(EQUIPE) ? demande : EQUIPE) : MEMBRE;
  const user = await getCurrentUser(espaceDe(page));

  const rendezvous = await prisma.rendezvous.findUnique({
    where: { id: texte(formData, "rendezvousId") },
    select: SELECTION,
  });
  if (!rendezvous || (user.role !== "admin" && rendezvous.userId !== user.id)) {
    redirectWithErreur(page, "Ce rendez-vous n’existe plus.");
  }
  if (rendezvous.annuleLe) {
    redirectWithErreur(page, "Ce rendez-vous est déjà annulé.");
  }

  await prisma.rendezvous.update({
    where: { id: rendezvous.id },
    data: { annuleLe: new Date(), annulePar: user.nom },
  });

  const details = await annonce(rendezvous);
  const parLeMembre = rendezvous.userId === user.id;
  const annulation = {
    titre: "Rendez-vous annulé",
    corps: `${details.type} · ${details.jour}, ${details.horaire} · annulé par ${user.nom}`,
  };
  after(() =>
    parLeMembre
      ? notifierEquipe({ ...annulation, url: EQUIPE })
      : notifier([rendezvous.userId], { ...annulation, url: MEMBRE }),
  );
  // Annulé par le membre : l'équipe et la personne qui reçoit sont prévenues ; par l'équipe : le membre,
  // avec l'invitation d'agenda marquée annulée pour retirer le rendez-vous de son calendrier
  const destinataires = parLeMembre
    ? [...new Set([await courrielEquipe(), rendezvous.hote?.email].filter((x): x is string => !!x))]
    : [rendezvous.user.email];
  after(async () => {
    for (const a of destinataires) {
      await envoyerCourriel(
        courrielRendezvousAnnule(a, {
          ...details,
          ics: ics(rendezvous, true),
          par: parLeMembre ? user.nom : "l’équipe CanCham",
          lien: await urlPublique(parLeMembre ? EQUIPE : MEMBRE),
        }),
      );
    }
  });

  await prisma.auditLog.create({
    data: {
      action: "rendezvous_annule",
      entite: "Rendezvous",
      entiteId: rendezvous.id,
      acteur: user.nom,
      detail: `« ${details.type} » du ${details.jour}, ${details.horaire} — annulé par ${
        parLeMembre ? "le membre" : "l’équipe"
      }.`,
    },
  });

  revalider();
  redirectWithFlash(
    page,
    "Rendez-vous annulé, le créneau est de nouveau libre",
  );
}

async function tracerReglage(acteur: string, detail: string) {
  await prisma.auditLog.create({
    data: {
      action: "rendezvous_reglages",
      entite: "Rendezvous",
      entiteId: "reglages",
      acteur,
      detail,
    },
  });
}

const PLAGES_MAX = 20;

function lirePlages(formData: FormData): Plage[] {
  const brut = texte(formData, "plages");
  if (!brut) return [];

  let lignes: unknown;
  try {
    lignes = JSON.parse(brut);
  } catch {
    redirectWithErreur(EQUIPE, "Les heures d’accueil n’ont pas été comprises.");
  }
  if (!Array.isArray(lignes)) {
    redirectWithErreur(EQUIPE, "Les heures d’accueil n’ont pas été comprises.");
  }
  if (lignes.length > PLAGES_MAX) {
    redirectWithErreur(EQUIPE, `${PLAGES_MAX} plages au plus par type.`);
  }

  const plages: Plage[] = [];
  for (const l of lignes as {
    jour?: unknown;
    debut?: unknown;
    fin?: unknown;
  }[]) {
    const jour = Number(l?.jour);
    const debut = String(l?.debut ?? "");
    const fin = String(l?.fin ?? "");
    const libelle = JOURS_SEMAINE.find((j) => j.cle === jour)?.libelle;

    if (!libelle)
      redirectWithErreur(EQUIPE, "Choisissez un jour de la semaine.");
    if (!estHeure(debut) || !estHeure(fin)) {
      redirectWithErreur(EQUIPE, "Les heures s’écrivent HH:MM.");
    }
    if (fin <= debut) {
      redirectWithErreur(
        EQUIPE,
        `${libelle} : la fin doit venir après le début.`,
      );
    }
    if (plages.some((p) => p.jour === jour && chevauche(p, { debut, fin }))) {
      redirectWithErreur(EQUIPE, `${libelle} : deux plages se chevauchent.`);
    }
    plages.push({ jour, debut, fin });
  }
  return plages;
}

export async function enregistrerTypeRendezvous(formData: FormData) {
  const user = await exigerEquipe();
  const id = texte(formData, "typeId");
  const titre = texte(formData, "titre").slice(0, TITRE_MAX);
  const detail = texte(formData, "detail").slice(0, DETAIL_MAX);
  const duree = nombre(formData, "duree");
  const actif = texte(formData, "actif") === "1";
  const plages = lirePlages(formData);
  const lieu = lireLieu(texte(formData, "lieu"));
  const couleurSaisie = texte(formData, "couleur");
  const couleur = COULEURS_TYPE.includes(couleurSaisie) ? couleurSaisie : null;
  const prix = texte(formData, "prix").slice(0, PRIX_MAX) || null;
  const aConfirmer = texte(formData, "aConfirmer") === "1";
  const hoteSaisi = texte(formData, "hoteId");
  const hote = hoteSaisi
    ? await prisma.user.findFirst({ where: { id: hoteSaisi, role: "admin" }, select: { id: true, nom: true, recoitRdv: true } })
    : null;
  if (hoteSaisi && !hote) redirectWithErreur(EQUIPE, "Cette personne ne fait plus partie de l’équipe.");

  if (!titre) redirectWithErreur(EQUIPE, "Donnez un titre à ce rendez-vous.");
  if (!Number.isInteger(duree) || duree < DUREE_MIN || duree > DUREE_MAX) {
    redirectWithErreur(
      EQUIPE,
      `La durée va de ${DUREE_MIN} à ${DUREE_MAX} minutes.`,
    );
  }

  const data = { titre, detail: detail || null, duree, actif, lieu, couleur, prix, aConfirmer, hoteId: hote?.id ?? null };
  if (id) {
    const existant = await prisma.typeRendezvous.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existant) redirectWithErreur(EQUIPE, "Ce type n’existe plus.");
    await prisma.$transaction([
      prisma.disponibilite.deleteMany({ where: { typeId: id } }),
      prisma.typeRendezvous.update({
        where: { id },
        data: { ...data, plages: { create: plages } },
      }),
    ]);
  } else {
    const dernier = await prisma.typeRendezvous.findFirst({
      orderBy: { ordre: "desc" },
      select: { ordre: true },
    });
    await prisma.typeRendezvous.create({
      data: {
        ...data,
        ordre: (dernier?.ordre ?? 0) + 1,
        plages: { create: plages },
      },
    });
  }

  await tracerReglage(
    user.nom,
    `${id ? "Type modifié" : "Type ajouté"} : « ${titre} » · ${duree} minutes · ${
      plages.length
        ? plages
            .map(
              (p) =>
                `${JOURS_SEMAINE.find((j) => j.cle === p.jour)?.libelle} ${p.debut}–${p.fin}`,
            )
            .join(", ")
        : "aucune heure d’accueil"
    }${hote ? ` · avec ${hote.nom}` : ""}${actif ? "" : " · masqué"}.`,
  );
  // Un type rattaché à une personne qui ne reçoit pas encore n'apparaît pas aux membres : on le signale
  if (hote && !hote.recoitRdv && actif) {
    revalider();
    redirectWithFlash(
      `${EQUIPE}?onglet=types`,
      `« ${titre} » enregistré. ${hote.nom} ne reçoit pas encore de rendez-vous : ouvrez-le dans « Qui reçoit » pour que les membres le voient.`,
    );
  }
  revalider();
  redirectWithFlash(
    `${EQUIPE}?onglet=types`,
    id
      ? "Type mis à jour"
      : actif && plages.length
        ? `Type « ${titre} » ajouté : son lien est prêt à copier`
        : `Type « ${titre} » ajouté`,
  );
}

export async function supprimerTypeRendezvous(formData: FormData) {
  const user = await exigerEquipe();
  const type = await prisma.typeRendezvous.findUnique({
    where: { id: texte(formData, "typeId") },
    select: { id: true, titre: true, _count: { select: { rendezvous: true } } },
  });
  if (!type) redirectWithErreur(EQUIPE, "Ce type n’existe plus.");

  if (type._count.rendezvous > 0) {
    await prisma.typeRendezvous.update({
      where: { id: type.id },
      data: { actif: false },
    });
    await tracerReglage(user.nom, `Type masqué : « ${type.titre} ».`);
    revalider();
    redirectWithFlash(
      EQUIPE,
      `« ${type.titre} » n’est plus proposé : des rendez-vous y sont rattachés, il est masqué plutôt que supprimé.`,
    );
  }

  await prisma.typeRendezvous.delete({ where: { id: type.id } });
  await tracerReglage(user.nom, `Type supprimé : « ${type.titre} ».`);
  revalider();
  redirectWithFlash(EQUIPE, `Type « ${type.titre} » supprimé`);
}

// Qui reçoit : spécialité, salle de visio fixe (Meet, Zoom…), et si la personne reçoit des rendez-vous
export async function enregistrerPersonneRdv(formData: FormData) {
  const moi = await exigerEquipe();
  const retour = `${EQUIPE}?onglet=equipe`;
  const id = texte(formData, "userId");
  const cible = await prisma.user.findFirst({ where: { id, role: "admin" }, select: { id: true, nom: true } });
  if (!cible) redirectWithErreur(retour, "Cette personne ne fait plus partie de l’équipe.");
  const specialite = texte(formData, "specialite").slice(0, 80) || null;
  const lien = texte(formData, "lienVisio");
  let lienVisio: string | null = null;
  if (lien) {
    try {
      const u = new URL(/^https?:\/\//i.test(lien) ? lien : `https://${lien}`);
      if (u.protocol !== "https:") throw new Error();
      lienVisio = u.toString().slice(0, 300);
    } catch {
      redirectWithErreur(retour, "Le lien de visio doit être une adresse https (Google Meet, Zoom, Teams…).");
    }
  }
  const recoit = texte(formData, "recoit") === "1";
  await prisma.user.update({ where: { id: cible.id }, data: { specialite, lienVisio, recoitRdv: recoit } });
  await tracerReglage(moi.nom, `${cible.nom} : ${recoit ? "reçoit des rendez-vous" : "ne reçoit pas de rendez-vous"}${specialite ? ` · ${specialite}` : ""}${lienVisio ? " · salle de visio" : ""}.`);
  revalider();
  redirectWithFlash(retour, recoit ? `${cible.nom} reçoit des rendez-vous` : `${cible.nom} ne reçoit pas de rendez-vous`);
}
