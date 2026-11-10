import "server-only";

import { prisma } from "@/lib/db";
import { nomFacture } from "@/lib/factures";
import { getUnreadTotal } from "@/lib/queries";
import { toISODate } from "@/lib/enums";
import { ajouterJours, echeanceFacture, fmtHeure } from "@/lib/agenda";
import { aujourdhuiISO, fmtDate, jourBase } from "@/lib/format";
import {
  ADHESION_PENDING,
  DELAI_REGLEMENT_JOURS,
  joursDeRetard,
  retardBloque,
  RETARD_BLOCAGE_JOURS,
} from "@/lib/membership";
import type { Space } from "@/lib/types";

export interface Notification {
  id: string;
  titre: string;
  temps: string;
  href: string;
  ton: "info" | "warn" | "bad";
  categorie:
    | "adhesion"
    | "paiement"
    | "message"
    | "evenement"
    | "actualite"
    | "offre"
    | "ressource"
    | "rappel"
    | "rendezvous";
}

export async function getNotifications(
  space: Space,
  memberId: string | null,
  userId: string,
): Promise<Notification[]> {
  return space === "admin"
    ? notificationsAdmin(userId)
    : notificationsMembre(memberId, userId);
}

const pluriel = (n: number, mot: string, pluriel = `${mot}s`) =>
  `${n} ${n > 1 ? pluriel : mot}`;

async function filNonLu(userId: string): Promise<string | null> {
  const [fil] = await prisma.$queryRaw<{ threadId: string }[]>`
    SELECT m."threadId"
    FROM messages m
    JOIN participants_fils p
      ON p."threadId" = m."threadId" AND p."userId" = ${userId}
    WHERE m."supprimeLe" IS NULL
      AND m."userId" IS DISTINCT FROM ${userId}
      AND (p."luLe" IS NULL OR m."sentAt" > p."luLe")
    ORDER BY m."sentAt" DESC
    LIMIT 1`;
  return fil?.threadId ?? null;
}

async function rappelsProches(
  userId: string,
  espace: "membre" | "admin",
): Promise<Notification[]> {
  const aujourdhui = aujourdhuiISO();
  const rows = await prisma.rappel.findMany({
    where: {
      userId,
      fait: false,
      jour: {
        gte: jourBase(aujourdhui),
        lte: jourBase(ajouterJours(aujourdhui, 1)),
      },
    },
    orderBy: [{ jour: "asc" }, { heure: "asc" }],
    select: { id: true, titre: true, jour: true, heure: true },
    take: 3,
  });
  return rows.map((r) => {
    const jour = toISODate(r.jour);
    return {
      id: `rappel-${r.id}`,
      titre: `Rappel : ${r.titre}`,
      temps: `${jour === aujourdhui ? "Aujourd’hui" : "Demain"}${
        r.heure ? ` · ${fmtHeure(r.heure)}` : ""
      }`,
      // Agenda retiré pour l'instant : à remettre « `/${espace}/agenda?date=${jour}&jour=${jour}` »
      href: `/${espace}`,
      ton: jour === aujourdhui ? "warn" : "info",
      categorie: "rappel",
    };
  });
}

async function rendezvousProches(
  userId: string,
  espace: "membre" | "admin",
): Promise<Notification[]> {
  const aujourdhui = aujourdhuiISO();
  const rows = await prisma.rendezvous.findMany({
    where: {
      ...(espace === "membre" ? { userId } : {}),
      annuleLe: null,
      jour: {
        gte: jourBase(aujourdhui),
        lte: jourBase(ajouterJours(aujourdhui, 1)),
      },
    },
    orderBy: [{ jour: "asc" }, { debut: "asc" }],
    select: {
      id: true,
      jour: true,
      debut: true,
      type: { select: { titre: true } },
      user: { select: { nom: true } },
    },
    take: 3,
  });
  return rows.map((r) => {
    const jour = toISODate(r.jour);
    return {
      id: `rendezvous-${r.id}`,
      titre:
        espace === "admin"
          ? `Rendez-vous : ${r.user.nom} · ${r.type.titre}`
          : `Rendez-vous : ${r.type.titre}`,
      temps: `${jour === aujourdhui ? "Aujourd’hui" : "Demain"} · ${fmtHeure(r.debut)}`,
      href: `/${espace}/rendez-vous`,
      ton: jour === aujourdhui ? "warn" : "info",
      categorie: "rendezvous",
    };
  });
}

async function notificationsAdmin(userId: string): Promise<Notification[]> {
  const semaine = new Date(Date.now() - 7 * 86_400_000);
  const [rappels, rendezvous, membres, nonLus, fil, prochain, aRegler, achats] =
    await Promise.all([
      rappelsProches(userId, "admin"),
      rendezvousProches(userId, "admin"),
      prisma.member.findMany({
        where: { statut: { not: "a_jour" } },
        select: { id: true, nom: true, statut: true },
        orderBy: { nom: "asc" },
      }),
      getUnreadTotal(userId),
      filNonLu(userId),
      prisma.event.findFirst({
        where: { date: { gte: jourBase() } },
        orderBy: { date: "asc" },
        select: { id: true, titre: true, date: true },
      }),
      prisma.invoice.findMany({
        where: { statut: "envoyee" },
        select: {
          id: true,
          numero: true,
          destinataireNom: true,
          member: { select: { nom: true } },
        },
      }),
      prisma.auditLog.count({
        where: { action: "ressource_achetee", createdAt: { gte: semaine } },
      }),
    ]);

  const liste: Notification[] = [...rappels, ...rendezvous];

  const versMembres = (statut: "candidature" | "en_retard" | "en_attente") => {
    const concernes = membres.filter((m) => m.statut === statut);
    return {
      concernes,
      href:
        concernes.length === 1
          ? `/admin/membres/${concernes[0].id}`
          : `/admin/membres?statut=${statut}`,
    };
  };

  const demandes = versMembres("candidature");
  if (demandes.concernes.length)
    liste.push({
      id: "candidatures",
      titre:
        demandes.concernes.length === 1
          ? `Demande d’adhésion de ${demandes.concernes[0].nom} à examiner`
          : `${pluriel(demandes.concernes.length, "demande")} d’adhésion à examiner`,
      temps: "À traiter",
      href: demandes.href,
      ton: "warn",
      categorie: "adhesion",
    });

  const retards = versMembres("en_retard");
  if (retards.concernes.length)
    liste.push({
      id: "retard",
      titre:
        retards.concernes.length === 1
          ? `Cotisation en retard : ${retards.concernes[0].nom}`
          : `${pluriel(retards.concernes.length, "cotisation")} en retard`,
      temps: "À relancer",
      href: retards.href,
      ton: "bad",
      categorie: "paiement",
    });

  const attentes = versMembres("en_attente");
  if (attentes.concernes.length)
    liste.push({
      id: "attente",
      titre:
        attentes.concernes.length === 1
          ? `Paiement attendu : ${attentes.concernes[0].nom}`
          : `${pluriel(attentes.concernes.length, "adhésion")} en attente de paiement`,
      temps: "À encaisser",
      href: attentes.href,
      ton: "warn",
      categorie: "paiement",
    });

  if (aRegler.length)
    liste.push({
      id: "factures",
      titre:
        aRegler.length === 1
          ? `Facture ${aRegler[0].numero} à régler · ${nomFacture(aRegler[0])}`
          : `${pluriel(aRegler.length, "facture")} à régler`,
      temps: "Paiements",
      href:
        aRegler.length === 1
          ? `/admin/paiements/${aRegler[0].id}`
          : "/admin/paiements?statut=envoyee",
      ton: "warn",
      categorie: "paiement",
    });

  if (nonLus)
    liste.push({
      id: "messages",
      titre: `${pluriel(nonLus, "message")} non ${nonLus > 1 ? "lus" : "lu"}`,
      temps: "Messagerie",
      href: fil ? `/admin/messagerie?t=${fil}` : "/admin/messagerie",
      ton: "info",
      categorie: "message",
    });

  if (achats)
    liste.push({
      id: "achats",
      titre: `${pluriel(achats, "demande")} d’achat de ressource cette semaine`,
      temps: "Ressources",
      href: "/admin/ressources",
      ton: "info",
      categorie: "ressource",
    });

  if (prochain)
    liste.push({
      id: "prochain",
      titre: `Prochain événement : ${prochain.titre}`,
      temps: fmtDate(toISODate(prochain.date), {
        day: "numeric",
        month: "short",
      }),
      href: `/admin/evenements/${prochain.id}`,
      ton: "info",
      categorie: "evenement",
    });

  return liste;
}

async function notificationsMembre(
  memberId: string | null,
  userId: string,
): Promise<Notification[]> {
  if (!memberId) return [];

  const aujourdhui = aujourdhuiISO();

  const [
    membre,
    nonLus,
    fil,
    inscription,
    offre,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Agenda / Actualités retirés pour l'instant, gardé pour les remettre
    actualite,
    rappels,
    rendezvous,
    factures,
  ] = await Promise.all([
    prisma.member.findUnique({
      where: { id: memberId },
      select: { statut: true, retardDepuis: true },
    }),
    getUnreadTotal(userId),
    filNonLu(userId),
    prisma.registration.findFirst({
      where: { memberId, event: { date: { gte: jourBase() } } },
      orderBy: { event: { date: "asc" } },
      select: { event: { select: { id: true, titre: true, date: true } } },
    }),
    prisma.offer.findFirst({
      where: { OR: [{ memberId: null }, { memberId: { not: memberId } }] },
      orderBy: { createdAt: "desc" },
      select: {
        titre: true,
        memberId: true,
        member: { select: { nom: true } },
      },
    }),
    prisma.news.findFirst({
      where: { OR: [{ memberId: null }, { memberId: { not: memberId } }] },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select: { id: true, titre: true, date: true },
    }),
    rappelsProches(userId, "membre"),
    rendezvousProches(userId, "membre"),
    prisma.invoice.findMany({
      where: {
        memberId,
        statut: "envoyee",
        date: {
          lte: jourBase(ajouterJours(aujourdhui, 7 - DELAI_REGLEMENT_JOURS)),
        },
      },
      orderBy: { date: "asc" },
      select: { id: true, numero: true, date: true },
      take: 3,
    }),
  ]);

  const liste: Notification[] = [];

  liste.push(...rappels, ...rendezvous);

  for (const f of factures) {
    const echeance = echeanceFacture(toISODate(f.date));
    const depassee = echeance < aujourdhui;
    liste.push({
      id: `echeance-${f.id}-${echeance}`,
      titre: depassee
        ? `Facture ${f.numero} : échéance dépassée`
        : `Facture ${f.numero} à régler avant le ${fmtDate(echeance, { day: "numeric", month: "long" })}`,
      temps: depassee
        ? `Depuis le ${fmtDate(echeance, { day: "numeric", month: "short" })}`
        : "Échéance proche",
      href: `/membre/cotisations/${f.id}`,
      ton: depassee ? "bad" : "warn",
      categorie: "paiement",
    });
  }

  if (membre) {
    const vue = {
      statut: membre.statut,
      retardDepuis: membre.retardDepuis ? toISODate(membre.retardDepuis) : null,
    } as Parameters<typeof joursDeRetard>[0];

    if (ADHESION_PENDING.includes(membre.statut))
      liste.push({
        id: "cotisation",
        titre: "Cotisation à régler pour activer votre accès complet",
        temps: "À traiter",
        href: "/membre/cotisations",
        ton: "warn",
        categorie: "paiement",
      });
    else if (membre.statut === "en_retard")
      liste.push({
        id: "retard",
        titre: retardBloque(vue)
          ? `Accès restreint — ${joursDeRetard(vue)} jours de retard`
          : `Cotisation en retard — ${joursDeRetard(vue)}/${RETARD_BLOCAGE_JOURS} jours écoulés`,
        temps: "À régulariser",
        href: "/membre/cotisations",
        ton: "bad",
        categorie: "paiement",
      });
  }

  if (nonLus)
    liste.push({
      id: "messages",
      titre: `${pluriel(nonLus, "message")} non ${nonLus > 1 ? "lus" : "lu"}`,
      temps: "Messagerie",
      href: fil ? `/membre/messagerie?t=${fil}` : "/membre/messagerie",
      ton: "info",
      categorie: "message",
    });

  if (inscription)
    liste.push({
      id: "inscription",
      titre: `Inscription confirmée : ${inscription.event.titre}`,
      temps: fmtDate(toISODate(inscription.event.date), {
        day: "numeric",
        month: "short",
      }),
      href: `/membre/evenements/${inscription.event.id}`,
      ton: "info",
      categorie: "evenement",
    });

  if (offre)
    liste.push({
      id: "offre",
      titre: `Offre de ${offre.member?.nom ?? "CanCham"} : ${offre.titre}`,
      temps: offre.member ? "Offres membres" : "Offre CanCham",
      href: offre.memberId
        ? `/membre/annuaire/${offre.memberId}`
        : "/membre", // Actualités retirées pour l'instant : « /membre/actualites »
      ton: "info",
      categorie: "offre",
    });

  // Actualités retirées pour l'instant : à décommenter pour le remettre
  // if (actualite)
  //   liste.push({
  //     id: "actualite",
  //     titre: `Actualité : ${actualite.titre}`,
  //     temps: fmtDate(toISODate(actualite.date), {
  //       day: "numeric",
  //       month: "short",
  //     }),
  //     href: `/membre/actualites/${actualite.id}`,
  //     ton: "info",
  //     categorie: "actualite",
  //   });

  return liste;
}
