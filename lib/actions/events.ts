"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { MemberStatus } from "@/lib/types";
import { EVENT_FORMAT_DB, toISODate } from "@/lib/enums";
import { estHeure, estJourISO } from "@/lib/agenda";
import { redirectWithErreur, redirectWithFlash } from "@/lib/flash";
import { fmtDate, fmtMoney, jourBase } from "@/lib/format";
import { urlPublique } from "@/lib/courriel";
import { minutes, origineAppelante, tentative } from "@/lib/limite";
import { envoyerAttente, envoyerBillets, lignesDe } from "@/lib/billets";
import { numeroFacture } from "@/lib/factures";
import { modesProposes } from "@/lib/reglements";
import {
  codeInscription,
  codeRepresentant,
  extraireCode,
} from "@/lib/codes-accueil";
import { estTermine } from "@/lib/presences";
import { telephoneValide } from "@/lib/accueil";
import { exigerEquipe } from "@/lib/autorisations";
import { getCurrentUser } from "@/lib/session";
import { enregistrerImage, ImageRefusee } from "@/lib/uploads";
import { INTERVENANTS_MAX, lireIntervenants } from "@/lib/intervenants";
import type { EventFormat } from "@/lib/types";
import {
  notifierEquipe,
  notifierMembre,
  notifierTousLesMembres,
} from "@/lib/push";

const texte = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const revalideTout = () => revalidatePath("/", "layout");

const ALPHABET_CODE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

async function codeAcces(eventId: string): Promise<string> {
  for (;;) {
    const tirage = Array.from(
      { length: 6 },
      () => ALPHABET_CODE[randomInt(ALPHABET_CODE.length)],
    ).join("");
    const code = `CC-${eventId.slice(-4).toUpperCase()}-${tirage}`;
    const [inscription, ligne] = await Promise.all([
      prisma.registration.findUnique({ where: { code }, select: { id: true } }),
      prisma.attendee.findFirst({
        where: lignesDe(code),
        select: { id: true },
      }),
    ]);
    if (!inscription && !ligne) return code;
  }
}

const REPRESENTANTS_MAX = 10;

const ADRESSE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function coordonneesSaisies(
  formData: FormData,
  retour: string,
): { email: string; telephone: string } {
  const email = texte(formData, "email").toLowerCase().slice(0, 120);
  const telephone = texte(formData, "telephone").replace(/\s+/g, " ");
  if (!ADRESSE.test(email)) {
    redirectWithErreur(retour, "Indiquez une adresse e-mail valide.");
  }
  if (!telephoneValide(telephone)) {
    redirectWithErreur(
      retour,
      telephone
        ? `« ${telephone} » n’est pas un numéro de téléphone valide.`
        : "Indiquez un numéro de téléphone.",
    );
  }
  return { email, telephone };
}

export async function registerForEvent(formData: FormData) {
  const eventId = texte(formData, "eventId");
  const fiche = `/membre/evenements/${eventId}`;
  const user = await getCurrentUser("membre");
  if (!user.memberId) {
    redirectWithErreur(fiche, "Aucun membre rattaché à ce compte.");
  }

  const [event, membre] = await Promise.all([
    prisma.event.findUnique({
      where: { id: eventId },
      include: { _count: { select: { participants: true } } },
    }),
    prisma.member.findUnique({
      where: { id: user.memberId },
      select: { nom: true },
    }),
  ]);
  if (!event || !membre) {
    redirectWithErreur("/membre/evenements", "Événement introuvable.");
  }

  const deja = await prisma.registration.findUnique({
    where: { eventId_memberId: { eventId, memberId: user.memberId } },
  });
  if (deja)
    redirectWithErreur(fiche, "Vous êtes déjà inscrit à cet événement.");

  const { email, telephone } = coordonneesSaisies(formData, fiche);

  const choisis = [...new Set(formData.getAll("representant").map(String))];
  const representants = await prisma.user.findMany({
    where: { id: { in: choisis }, memberId: user.memberId },
    orderBy: [{ contactPrincipal: "desc" }, { createdAt: "asc" }],
    select: { nom: true, email: true },
  });
  if (!representants.length) {
    redirectWithErreur(fiche, "Choisissez au moins un représentant.");
  }
  if (representants.length > REPRESENTANTS_MAX) {
    redirectWithErreur(
      fiche,
      `${REPRESENTANTS_MAX} représentants au plus par entreprise.`,
    );
  }

  const restantes = event.cap - event._count.participants;
  if (representants.length > restantes) {
    redirectWithErreur(
      fiche,
      restantes > 0
        ? `Il ne reste que ${restantes} place${restantes > 1 ? "s" : ""} : choisissez moins de représentants.`
        : "Cet événement est complet.",
    );
  }

  const code = await codeAcces(eventId);
  const n = representants.length;

  const ecritures: Prisma.PrismaPromise<unknown>[] = [
    prisma.registration.create({
      data: { eventId, memberId: user.memberId, code },
    }),
    prisma.attendee.createMany({
      data: representants.map((r, i) => ({
        eventId,
        nom: r.nom,
        entreprise: membre.nom,
        email,
        telephone,
        statut: event.payant ? ("a_valider" as const) : ("confirme" as const),
        code: codeRepresentant(code, i),
      })),
    }),
  ];

  if (event.payant) {
    const date = jourBase();
    ecritures.push(
      prisma.invoice.create({
        data: {
          numero: await numeroFacture(date),
          date,
          objet: `Participation — ${event.titre}${n > 1 ? ` (${n} personnes)` : ""}`,
          montant: event.prix * n,
          statut: "envoyee",
          memberId: user.memberId,
          eventId,
        },
        select: { id: true },
      }),
    );
  }

  const ecrit = await prisma.$transaction(ecritures);
  const facture = event.payant
    ? (ecrit[ecrit.length - 1] as { id: string })
    : null;

  const participants = representants.map((r, i) => ({
    nom: r.nom,
    code: codeRepresentant(code, i),
  }));
  const lien = await urlPublique(fiche);
  if (event.payant) {
    envoyerAttente(event, participants, email, lien, fmtMoney(event.prix * n));
  } else {
    envoyerBillets(event, participants, email, lien);
  }
  after(() =>
    notifierEquipe({
      titre: `Inscription : ${event.titre}`,
      corps: `${membre.nom} · ${n} représentant${n > 1 ? "s" : ""}${event.payant ? ` · ${fmtMoney(event.prix * n)} à régler` : ""}`,
      url: `/admin/evenements/${eventId}`,
    }),
  );

  revalideTout();

  if (facture && (await modesProposes()).length) {
    redirectWithFlash(
      `${fiche}?regler=${facture.id}`,
      `Inscription enregistrée · ${n} représentant${n > 1 ? "s" : ""} · choisissez votre moyen de paiement`,
    );
  }

  redirectWithFlash(
    fiche,
    event.payant
      ? `Inscription enregistrée · ${n} représentant${n > 1 ? "s" : ""} · facture générée · billets envoyés dès validation du règlement`
      : `Inscription confirmée · ${n} représentant${n > 1 ? "s" : ""} · billets envoyés à ${email}`,
  );
}

const INSCRIPTIONS_PUBLIQUES_PAR_HEURE = 10;

export async function inscriptionPublique(formData: FormData) {
  const eventId = texte(formData, "eventId");
  const fiche = `/evenements/${eventId}`;

  const attente = tentative(
    `inscription-publique:${await origineAppelante()}`,
    INSCRIPTIONS_PUBLIQUES_PAR_HEURE,
    60 * 60 * 1000,
  );
  if (attente) {
    redirectWithErreur(
      fiche,
      `Trop d’inscriptions depuis cet appareil. Réessayez dans ${minutes(attente)} minute${minutes(attente) > 1 ? "s" : ""}.`,
    );
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { _count: { select: { participants: true } } },
  });
  if (!event?.public) {
    redirectWithErreur("/", "Événement introuvable.");
  }
  if (estTermine(event)) {
    redirectWithErreur(fiche, "Cet événement est terminé.");
  }

  const entreprise = texte(formData, "entreprise")
    .replace(/\s+/g, " ")
    .slice(0, 120);
  const noms = [
    ...new Set(
      formData
        .getAll("representant")
        .map((v) => String(v).replace(/\s+/g, " ").trim().slice(0, 80))
        .filter(Boolean),
    ),
  ];
  if (!entreprise) {
    redirectWithErreur(
      fiche,
      "Indiquez le nom de l’entreprise (ou N/A si vous venez à titre personnel).",
    );
  }
  if (!noms.length) {
    redirectWithErreur(fiche, "Indiquez le nom d’au moins un représentant.");
  }
  if (noms.length > REPRESENTANTS_MAX) {
    redirectWithErreur(
      fiche,
      `${REPRESENTANTS_MAX} représentants au plus par inscription.`,
    );
  }
  const { email, telephone } = coordonneesSaisies(formData, fiche);

  const restantes = event.cap - event._count.participants;
  if (noms.length > restantes) {
    redirectWithErreur(
      fiche,
      restantes > 0
        ? `Il ne reste que ${restantes} place${restantes > 1 ? "s" : ""} : inscrivez moins de représentants.`
        : "Cet événement est complet.",
    );
  }

  const deja = await prisma.attendee.findFirst({
    where: {
      eventId,
      email: { equals: email, mode: "insensitive" },
      code: { not: null },
    },
    select: { code: true },
  });
  if (deja) {
    redirectWithErreur(
      fiche,
      `${email} est déjà inscrite à cet événement : l’e-mail de confirmation contient vos billets.`,
    );
  }

  const code = await codeAcces(eventId);
  const n = noms.length;
  const aRegler = event.prixPublic > 0 ? fmtMoney(event.prixPublic * n) : null;
  await prisma.$transaction([
    prisma.attendee.createMany({
      data: noms.map((nom, i) => ({
        eventId,
        nom,
        entreprise,
        email,
        telephone,
        statut: aRegler ? ("a_valider" as const) : ("confirme" as const),
        code: codeRepresentant(code, i),
      })),
    }),
    prisma.auditLog.create({
      data: {
        action: "inscription_publique",
        entite: "Event",
        entiteId: eventId,
        acteur: noms[0],
        detail: `« ${event.titre} » · ${entreprise} · ${n} personne${n > 1 ? "s" : ""} · ${email} · ${telephone}${aRegler ? ` · ${aRegler} à régler` : ""}.`,
      },
    }),
  ]);

  const lien = await urlPublique(
    `/evenements/${eventId}/billet?${new URLSearchParams({ code })}`,
  );
  const participants = noms.map((nom, i) => ({
    nom,
    code: codeRepresentant(code, i),
  }));
  if (aRegler) {
    envoyerAttente(event, participants, email, lien, aRegler);
  } else {
    envoyerBillets(event, participants, email, lien);
  }
  after(() =>
    notifierEquipe({
      titre: `Inscription publique : ${event.titre}`,
      corps: `${entreprise} · ${n} personne${n > 1 ? "s" : ""}${aRegler ? ` · ${aRegler} à régler` : ""}`,
      url: `/admin/evenements/${eventId}`,
    }),
  );

  revalideTout();
  redirect(`/evenements/${eventId}/billet?${new URLSearchParams({ code })}`);
}

export async function cancelRegistration(formData: FormData) {
  const eventId = texte(formData, "eventId");
  const user = await getCurrentUser("membre");
  if (!user.memberId)
    redirectWithErreur("/membre/evenements", "Aucun membre rattaché.");

  const membre = await prisma.member.findUnique({
    where: { id: user.memberId },
    select: { nom: true },
  });

  const inscription = await prisma.registration.findUnique({
    where: { eventId_memberId: { eventId, memberId: user.memberId } },
    select: { code: true },
  });
  await prisma.registration.deleteMany({
    where: { eventId, memberId: user.memberId },
  });
  await prisma.attendee.deleteMany({
    where: {
      eventId,
      OR: [
        ...(inscription ? [lignesDe(inscription.code)] : []),
        { entreprise: membre?.nom, statut: "confirme", code: null },
      ],
    },
  });

  revalideTout();
  redirectWithFlash(`/membre/evenements/${eventId}`, "Inscription annulée");
}

async function acteurEquipe(): Promise<string> {
  return (await getCurrentUser("admin")).nom;
}

const pageEvenement = (id: string) => `/admin/evenements/${id}`;

function retourListe(fd: FormData, eventId: string, onglet?: string): string {
  const base = pageEvenement(eventId);
  const r = texte(fd, "retour");
  if (r === base || r.startsWith(`${base}?`)) return r;
  const q = new URLSearchParams({ vue: "inscrits" });
  if (onglet && onglet !== "tous") q.set("onglet", onglet);
  return `${base}?${q}`;
}

export async function saveEvent(formData: FormData) {
  await exigerEquipe();
  const id = texte(formData, "eventId");
  const retour = id
    ? `/admin/evenements/${id}/modifier`
    : "/admin/evenements/nouveau";

  const titre = texte(formData, "titre");
  const jour = texte(formData, "date");
  const cap = Math.round(Number(formData.get("cap")));
  const payant = texte(formData, "type") === "payant";
  const prix = payant ? Math.round(Number(formData.get("prix"))) : 0;
  const estPublic = texte(formData, "diffusion") !== "plateforme";
  const payantPublic = estPublic && texte(formData, "typePublic") === "payant";
  const prixPublic = payantPublic
    ? Math.round(Number(formData.get("prixPublic")))
    : 0;

  const debut = texte(formData, "debut") || null;
  const fin = texte(formData, "fin") || null;

  if (!titre) redirectWithErreur(retour, "Le titre est obligatoire.");
  if (!estJourISO(jour)) {
    redirectWithErreur(retour, "Indiquez la date de l’événement.");
  }
  if ((debut && !estHeure(debut)) || (fin && !estHeure(fin))) {
    redirectWithErreur(retour, "Les heures s’écrivent HH:MM.");
  }
  if (fin && !debut) {
    redirectWithErreur(retour, "Indiquez l’heure de début avant celle de fin.");
  }
  if (debut && fin && fin <= debut) {
    redirectWithErreur(retour, "L’heure de fin doit suivre celle du début.");
  }
  if (!Number.isFinite(cap) || cap < 1) {
    redirectWithErreur(retour, "La capacité doit être d’au moins une place.");
  }
  if (payant && (!Number.isFinite(prix) || prix <= 0)) {
    redirectWithErreur(retour, "Indiquez le prix membre.");
  }
  if (payantPublic && (!Number.isFinite(prixPublic) || prixPublic <= 0)) {
    redirectWithErreur(retour, "Indiquez le prix public.");
  }

  let photo: string | null = null;
  try {
    photo = await enregistrerImage(formData.get("photo"), {
      prefixe: "evenement",
      largeur: 1600,
    });
  } catch (e) {
    if (e instanceof ImageRefusee) redirectWithErreur(retour, e.message);
    throw e;
  }

  // Intervenants : chaque photo envoyée est enregistrée avant la transaction, comme celle de l'événement
  const noms = formData.getAll("intervenantNom").map(String);
  const nouvelles: (string | null)[] = [];
  let gardes = 0;
  for (let i = 0; i < noms.length; i++) {
    // Pas de photo enregistrée pour une ligne ignorée (sans nom, ou au-delà du maximum)
    if (!noms[i].trim() || gardes >= INTERVENANTS_MAX) {
      nouvelles.push(null);
      continue;
    }
    gardes++;
    try {
      nouvelles.push(
        await enregistrerImage(formData.get(`intervenantPhoto-${i}`), {
          prefixe: "intervenant",
          largeur: 600,
        }),
      );
    } catch (e) {
      if (e instanceof ImageRefusee) {
        redirectWithErreur(retour, `Photo de ${noms[i].trim()} : ${e.message}`);
      }
      throw e;
    }
  }
  const intervenants = lireIntervenants({
    noms,
    fonctions: formData.getAll("intervenantFonction").map(String),
    entreprises: formData.getAll("intervenantEntreprise").map(String),
    bios: formData.getAll("intervenantBio").map(String),
    actuelles: formData.getAll("intervenantPhotoActuelle").map(String),
    nouvelles,
    retirees: noms.map((_, i) => texte(formData, `intervenantRetirer-${i}`) === "1"),
  });

  const heures = formData.getAll("etapeHeure").map(String);
  const titres = formData.getAll("etapeTitre").map(String);
  const details = formData.getAll("etapeDetail").map(String);
  const programme = titres
    .map((t, i) => ({
      heure: (heures[i] ?? "").trim(),
      titre: t.trim(),
      detail: (details[i] ?? "").trim() || null,
    }))
    .filter((e) => e.titre)
    .map((e, ordre) => ({ ...e, ordre }));

  const data = {
    titre,
    date: jourBase(jour),
    debut,
    fin,
    lieu: texte(formData, "lieu") || "Antananarivo",
    format:
      EVENT_FORMAT_DB[
        (texte(formData, "format") || "Présentiel") as EventFormat
      ] ?? "presentiel",
    cap,
    payant,
    prix,
    public: estPublic,
    prixPublic,
    desc: texte(formData, "desc") || "Détails à venir.",
    pourQui: texte(formData, "pourQui") || null,
  };
  const retirerPhoto = texte(formData, "retirerPhoto") === "1";

  const e = await prisma.$transaction(async (tx) => {
    const ev = id
      ? await tx.event.update({
          where: { id },
          data: {
            ...data,
            ...(photo ? { photo } : retirerPhoto ? { photo: null } : {}),
          },
        })
      : await tx.event.create({ data: { ...data, photo } });
    await tx.eventAgenda.deleteMany({ where: { eventId: ev.id } });
    if (programme.length) {
      await tx.eventAgenda.createMany({
        data: programme.map((etape) => ({ ...etape, eventId: ev.id })),
      });
    }
    await tx.eventIntervenant.deleteMany({ where: { eventId: ev.id } });
    if (intervenants.length) {
      await tx.eventIntervenant.createMany({
        data: intervenants.map((p) => ({ ...p, eventId: ev.id })),
      });
    }
    return ev;
  });

  await prisma.auditLog.create({
    data: {
      action: id ? "evenement_modifie" : "evenement_cree",
      entite: "Event",
      entiteId: e.id,
      acteur: await acteurEquipe(),
      detail: `« ${e.titre} » · ${e.date.toLocaleDateString("fr-FR", { timeZone: "UTC" })} · ${e.lieu} · ${e.public ? "plateforme et page publique" : "plateforme uniquement"}.`,
    },
  });

  if (!id) {
    after(() =>
      notifierTousLesMembres({
        titre: "Nouvel événement CanCham",
        corps: `${e.titre} · ${fmtDate(toISODate(e.date), { day: "numeric", month: "long" })} · ${e.lieu}`,
        url: `/membre/evenements/${e.id}`,
      }),
    );
  }

  revalideTout();
  redirectWithFlash(
    pageEvenement(e.id),
    id
      ? `« ${e.titre} » mis à jour`
      : `« ${e.titre} » créé · ${e.public ? "publié sur la plateforme et la page publique" : "publié sur la plateforme"}`,
  );
}

export async function deleteEvent(formData: FormData) {
  await exigerEquipe();
  const id = texte(formData, "eventId");
  const e = await prisma.event.findUnique({
    where: { id },
    select: { titre: true, _count: { select: { participants: true } } },
  });
  if (!e) redirectWithErreur("/admin/evenements", "Événement introuvable.");

  await prisma.auditLog.create({
    data: {
      action: "evenement_supprime",
      entite: "Event",
      entiteId: id,
      acteur: await acteurEquipe(),
      detail: `Suppression de « ${e.titre} » et de ses ${e._count.participants} participant${e._count.participants > 1 ? "s" : ""}.`,
    },
  });
  await prisma.event.delete({ where: { id } });
  revalideTout();
  redirectWithFlash("/admin/evenements", `« ${e.titre} » supprimé`);
}

export async function validerInscription(formData: FormData) {
  await exigerEquipe();
  const attendeeId = texte(formData, "attendeeId");
  const eventId = texte(formData, "eventId");
  const retour = retourListe(formData, eventId);

  const ligne = await prisma.attendee.findUnique({
    where: { id: attendeeId },
    include: { event: true },
  });
  if (!ligne || ligne.eventId !== eventId) {
    redirectWithErreur(retour, "Participant introuvable.");
  }
  if (ligne.statut !== "a_valider") {
    redirectWithErreur(
      retour,
      `L’inscription de ${ligne.nom} est déjà validée.`,
    );
  }

  const racine = ligne.code ? codeInscription(ligne.code) : null;
  const groupe = racine
    ? await prisma.attendee.findMany({
        where: { eventId, statut: "a_valider", ...lignesDe(racine) },
        orderBy: { createdAt: "asc" },
      })
    : [ligne];
  const n = groupe.length;

  await prisma.$transaction([
    prisma.attendee.updateMany({
      where: { id: { in: groupe.map((g) => g.id) } },
      data: { statut: "confirme" },
    }),
    prisma.auditLog.create({
      data: {
        action: "inscription_validee",
        entite: "Event",
        entiteId: eventId,
        acteur: await acteurEquipe(),
        detail: `« ${ligne.event.titre} » · ${ligne.entreprise} · ${n} personne${n > 1 ? "s" : ""} · ${ligne.email} · billets envoyés.`,
      },
    }),
  ]);

  const inscriptionMembre = racine
    ? await prisma.registration.findUnique({
        where: { code: racine },
        select: { id: true, memberId: true },
      })
    : null;
  const lien = await urlPublique(
    inscriptionMembre || !racine
      ? `/membre/evenements/${eventId}`
      : `/evenements/${eventId}/billet?${new URLSearchParams({ code: racine })}`,
  );
  const participants = groupe.flatMap((g) =>
    g.code ? [{ nom: g.nom, code: g.code }] : [],
  );
  if (participants.length && ligne.email.includes("@")) {
    envoyerBillets(ligne.event, participants, ligne.email, lien);
  }
  if (inscriptionMembre) {
    const memberId = inscriptionMembre.memberId;
    after(() =>
      notifierMembre(memberId, {
        titre: `Billets prêts : ${ligne.event.titre}`,
        corps: `Inscription validée · ${n} participant${n > 1 ? "s" : ""}`,
        url: `/membre/evenements/${eventId}`,
      }),
    );
  }

  revalideTout();
  redirectWithFlash(
    retour,
    participants.length && ligne.email.includes("@")
      ? `Inscription validée · billets envoyés à ${ligne.email}`
      : "Inscription validée",
  );
}

export async function toggleAttendance(formData: FormData) {
  await exigerEquipe();
  const attendeeId = texte(formData, "attendeeId");
  const eventId = texte(formData, "eventId");
  const retour = retourListe(formData, eventId);
  const a = await prisma.attendee.findUnique({ where: { id: attendeeId } });
  if (!a || a.eventId !== eventId) {
    redirectWithErreur(retour, "Participant introuvable.");
  }

  const demande = texte(formData, "statut");
  const statut =
    demande === "present" || demande === "absent"
      ? demande
      : a.statut === "present"
        ? "absent"
        : "present";
  await prisma.attendee.update({
    where: { id: attendeeId },
    data: {
      statut,
      presentLe: statut === "present" ? (a.presentLe ?? new Date()) : null,
    },
  });
  revalideTout();
  redirectWithFlash(
    retour,
    `${a.nom} — ${statut === "present" ? "présent" : "absent"}`,
  );
}

export interface ArriveeAccueil {
  id: string;
  representant: string;
  entreprise: string;
  email: string;
  telephone: string | null;
  code: string | null;
  presentLe: string | null;
  membre: {
    id: string;
    nom: string;
    logo: string | null;
    photo: string | null;
    type: "morale" | "physique";
    statut: MemberStatus;
    secteur: string;
    ville: string;
  } | null;
  inscrits: {
    id: string;
    nom: string;
    statut: "a_valider" | "confirme" | "present" | "absent";
  }[];
}

export type ResultatScan =
  | { etat: "present" | "deja"; code: string; arrivee: ArriveeAccueil }
  | { etat: "erreur"; code: string; message: string };

async function decrireArrivees(
  eventId: string,
  lignes: {
    id: string;
    nom: string;
    entreprise: string;
    email: string;
    telephone: string | null;
    code: string | null;
    presentLe: Date | null;
  }[],
): Promise<ArriveeAccueil[]> {
  const bases = [
    ...new Set(
      lignes.flatMap((l) => (l.code ? [codeInscription(l.code)] : [])),
    ),
  ];
  const [inscriptions, collegues] = bases.length
    ? await Promise.all([
        prisma.registration.findMany({
          where: { code: { in: bases } },
          select: {
            code: true,
            member: {
              select: {
                id: true,
                nom: true,
                logo: true,
                photo: true,
                type: true,
                statut: true,
                secteur: true,
                ville: true,
              },
            },
          },
        }),
        prisma.attendee.findMany({
          where: { eventId, OR: bases.map(lignesDe) },
          orderBy: { code: "asc" },
          select: { id: true, nom: true, statut: true, code: true },
        }),
      ])
    : [[], []];
  const membres = new Map(inscriptions.map((i) => [i.code, i.member]));

  return lignes.map((l) => {
    const base = l.code ? codeInscription(l.code) : null;
    return {
      id: l.id,
      representant: l.nom,
      entreprise: l.entreprise,
      email: l.email,
      telephone: l.telephone,
      code: l.code,
      presentLe: l.presentLe?.toISOString() ?? null,
      membre: (base && membres.get(base)) || null,
      inscrits: base
        ? collegues
            .filter((c) => c.code && codeInscription(c.code) === base)
            .map(({ id, nom, statut }) => ({ id, nom, statut }))
        : [{ id: l.id, nom: l.nom, statut: "present" as const }],
    };
  });
}

export async function historiqueAccueil(
  eventId: string,
): Promise<ArriveeAccueil[]> {
  await getCurrentUser("admin");
  const lignes = await prisma.attendee.findMany({
    where: { eventId, statut: "present" },
    orderBy: [{ presentLe: { sort: "desc", nulls: "last" } }, { nom: "asc" }],
    select: {
      id: true,
      nom: true,
      entreprise: true,
      email: true,
      telephone: true,
      code: true,
      presentLe: true,
    },
  });
  return decrireArrivees(eventId, lignes);
}

export async function pointerParCode(
  eventId: string,
  lu: string,
): Promise<ResultatScan> {
  await getCurrentUser("admin");

  const code = extraireCode(lu);
  if (!code) return { etat: "erreur", code, message: "Aucun code lu." };

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { titre: true, date: true, fin: true },
  });
  if (!event) {
    return { etat: "erreur", code, message: "Événement introuvable." };
  }
  if (estTermine(event)) {
    return {
      etat: "erreur",
      code,
      message:
        "L’événement est terminé : les personnes non pointées ont été marquées absentes.",
    };
  }

  let ligne = await prisma.attendee.findUnique({ where: { code } });

  if (!ligne) {
    const inscription = await prisma.registration.findUnique({
      where: { code },
      select: {
        eventId: true,
        member: {
          select: {
            id: true,
            nom: true,
            users: {
              orderBy: [{ contactPrincipal: "desc" }, { createdAt: "asc" }],
              take: 1,
              select: { nom: true, email: true },
            },
          },
        },
      },
    });
    if (!inscription) {
      return { etat: "erreur", code, message: `Code inconnu : ${code}.` };
    }
    if (inscription.eventId !== eventId) {
      const autre = await prisma.event.findUnique({
        where: { id: inscription.eventId },
        select: { titre: true },
      });
      return {
        etat: "erreur",
        code,
        message: `Ce code est celui d’un autre événement : « ${autre?.titre ?? "?"} ».`,
      };
    }
    const libre = await prisma.attendee.findFirst({
      where: { eventId, entreprise: inscription.member.nom, code: null },
      orderBy: { createdAt: "asc" },
    });
    const contact = inscription.member.users[0];
    ligne = libre
      ? await prisma.attendee.update({
          where: { id: libre.id },
          data: { code },
        })
      : await prisma.attendee.create({
          data: {
            eventId,
            nom: contact?.nom ?? inscription.member.nom,
            entreprise: inscription.member.nom,
            email: contact?.email ?? "—",
            statut: "confirme",
            code,
          },
        });
  }

  if (ligne.eventId !== eventId) {
    const autre = await prisma.event.findUnique({
      where: { id: ligne.eventId },
      select: { titre: true },
    });
    return {
      etat: "erreur",
      code,
      message: `Ce code est celui d’un autre événement : « ${autre?.titre ?? "?"} ».`,
    };
  }

  if (ligne.statut === "a_valider") {
    return {
      etat: "erreur",
      code,
      message: `${ligne.nom} : inscription en attente de validation. Le règlement n’a pas encore été constaté.`,
    };
  }

  if (ligne.statut === "present") {
    const [arrivee] = await decrireArrivees(eventId, [ligne]);
    return { etat: "deja", code, arrivee };
  }

  const pointee = await prisma.attendee.update({
    where: { id: ligne.id },
    data: { statut: "present", presentLe: new Date() },
  });
  revalideTout();
  const [arrivee] = await decrireArrivees(eventId, [pointee]);
  return { etat: "present", code, arrivee };
}

export async function addAttendee(formData: FormData) {
  await exigerEquipe();
  const eventId = texte(formData, "eventId");
  const nom = texte(formData, "nom");
  if (!nom) {
    redirectWithErreur(
      retourListe(formData, eventId),
      "Le nom de la personne est requis.",
    );
  }

  const direct = texte(formData, "direct") === "1";
  await prisma.attendee.create({
    data: {
      eventId,
      nom,
      entreprise: texte(formData, "entreprise") || "Participant individuel",
      email: texte(formData, "email") || "—",
      statut: direct ? "present" : "confirme",
      presentLe: direct ? new Date() : null,
    },
  });

  revalideTout();
  redirectWithFlash(
    retourListe(formData, eventId, direct ? "presents" : undefined),
    direct
      ? `${nom} enregistré comme présent (arrivée directe)`
      : `${nom} inscrit à l’événement`,
  );
}

export async function retirerParticipant(formData: FormData) {
  await exigerEquipe();
  const attendeeId = texte(formData, "attendeeId");
  const eventId = texte(formData, "eventId");
  const retour = retourListe(formData, eventId);
  const a = await prisma.attendee.findUnique({ where: { id: attendeeId } });
  if (!a || a.eventId !== eventId) {
    redirectWithErreur(retour, "Participant introuvable.");
  }
  await prisma.attendee.delete({ where: { id: attendeeId } });
  revalideTout();
  redirectWithFlash(retour, `${a.nom} retiré de la liste`);
}
