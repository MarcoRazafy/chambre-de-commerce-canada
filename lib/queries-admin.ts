import "server-only";

import { blocsEnregistres, type Bloc } from "@/lib/blocs";
import { prisma } from "@/lib/db";
import { RESOURCE_CAT_LABEL } from "@/lib/enums";
import { jourBase } from "@/lib/format";
import { codesDeFamille, type FamilleJournal } from "@/lib/journal";
import type { Devise, Formule } from "@/lib/membership";
import type { MemberStatus, NiveauEquipe, NoteMembre } from "@/lib/types";
import { exigerEquipe } from "@/lib/autorisations";
import { chambreCourante } from "@/lib/chambre-courante";

export interface EntreeJournal {
  id: string;
  action: string;
  entite: string;
  entiteId: string;
  acteur: string;
  detail: string | null;
  date: string;
}

function versEntree(r: {
  id: string;
  action: string;
  entite: string;
  entiteId: string;
  acteur: string;
  detail: string | null;
  createdAt: Date;
}): EntreeJournal {
  return {
    id: r.id,
    action: r.action,
    entite: r.entite,
    entiteId: r.entiteId,
    acteur: r.acteur,
    detail: r.detail,
    date: r.createdAt.toISOString(),
  };
}

export async function getJournal({
  limite = 50,
  page = 1,
  famille,
  entite,
  entiteId,
  recherche,
}: {
  limite?: number;
  page?: number;
  famille?: FamilleJournal;
  entite?: string;
  entiteId?: string;
  recherche?: string;
} = {}): Promise<{ entrees: EntreeJournal[]; total: number }> {
  const where = {
    action: famille ? { in: codesDeFamille(famille) } : { not: "seed" },
    ...(entite ? { entite } : {}),
    ...(entiteId ? { entiteId } : {}),
    ...(recherche
      ? {
          OR: [
            { detail: { contains: recherche, mode: "insensitive" as const } },
            { acteur: { contains: recherche, mode: "insensitive" as const } },
            { entiteId: { contains: recherche, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limite,
      skip: (page - 1) * limite,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    total,
    entrees: rows.map(versEntree),
  };
}

export async function getNotesMembre(memberId: string): Promise<NoteMembre[]> {
  const user = await exigerEquipe();
  const rows = await prisma.noteMembre.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((n) => ({
    id: n.id,
    texte: n.texte,
    auteur: n.auteur,
    date: n.createdAt.toISOString(),
    moi: n.userId === user.id,
  }));
}

export async function getHistoriqueMembre(
  memberId: string,
): Promise<EntreeJournal[]> {
  const numeros = (
    await prisma.invoice.findMany({
      where: { memberId },
      select: { numero: true },
    })
  ).map((f) => f.numero);

  const rows = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entite: "Member", entiteId: memberId },
        { entite: "Invoice", entiteId: { in: numeros } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return rows.map(versEntree);
}

export type Montants = Record<Devise, number>;

export async function getFinancesAnnee(annee: number | null): Promise<{
  encaisse: Montants;
  aEncaisser: Montants;
  factures: number;
  enAttente: number;
}> {
  const rows = await prisma.invoice.groupBy({
    by: ["devise", "statut"],
    where:
      annee === null
        ? undefined
        : {
            date: {
              gte: jourBase(`${annee}-01-01`),
              lt: jourBase(`${annee + 1}-01-01`),
            },
          },
    _sum: { montant: true },
    _count: { _all: true },
  });

  const somme = (statut: "payee" | "envoyee", devise: Devise) =>
    rows.find((r) => r.statut === statut && r.devise === devise)?._sum
      .montant ?? 0;
  const compte = (statut?: "payee" | "envoyee") =>
    rows
      .filter((r) => !statut || r.statut === statut)
      .reduce((n, r) => n + r._count._all, 0);

  return {
    encaisse: { MGA: somme("payee", "MGA"), CAD: somme("payee", "CAD") },
    aEncaisser: { MGA: somme("envoyee", "MGA"), CAD: somme("envoyee", "CAD") },
    factures: compte(),
    enAttente: compte("envoyee"),
  };
}

export async function getAnneesFactures(): Promise<number[]> {
  // SQL brut : la limite de Chambre automatique ne s'applique pas, d'où le filtre
  const rows = await prisma.$queryRaw<{ annee: number }[]>`
    SELECT DISTINCT EXTRACT(YEAR FROM date)::int AS annee
    FROM invoices WHERE "chambreId" = ${await chambreCourante()} ORDER BY annee DESC`;
  return rows.map((r) => r.annee);
}

export async function getRepartitionFormules(): Promise<
  { formule: Formule; n: number }[]
> {
  const [rows, formules] = await Promise.all([
    prisma.member.groupBy({
      by: ["formuleId"],
      where: { statut: { not: "candidature" }, formuleId: { not: null } },
      _count: { _all: true },
    }),
    prisma.formuleAdhesion.findMany({ select: { id: true, pays: true, profil: true, montant: true, devise: true } }),
  ]);
  const parId = new Map(formules.map((f) => [f.id, f]));
  return rows
    .flatMap((r) => {
      const formule = r.formuleId ? parId.get(r.formuleId) : undefined;
      return formule ? [{ formule, n: r._count._all }] : [];
    })
    .sort((a, b) => b.n - a.n);
}

export async function getDemandesAchat(limite = 5): Promise<EntreeJournal[]> {
  const rows = await prisma.auditLog.findMany({
    where: { action: "ressource_achetee" },
    orderBy: { createdAt: "desc" },
    take: limite,
  });
  return rows.map(versEntree);
}

export interface Participant {
  id: string;
  nom: string;
  entreprise: string;
  email: string;
  telephone: string | null;
  statut: "a_valider" | "confirme" | "present" | "absent";
}

export async function getParticipants(eventId: string): Promise<Participant[]> {
  return prisma.attendee.findMany({
    where: { eventId },
    orderBy: { nom: "asc" },
    select: {
      id: true,
      nom: true,
      entreprise: true,
      email: true,
      telephone: true,
      statut: true,
    },
  });
}

export interface RessourceAdmin {
  id: string;
  titre: string;
  cat: string;
  fmt: "pdf" | "docx" | "video" | "image" | "page";
  taille: string;
  date: string;
  type: "gratuit" | "payant";
  prix: number;
  description: string | null;
  pret: boolean;
  pages: number | null;
  cover: string | null;
  dossierId: string | null;
  commentaires: number;
  demandes: number;
}

export async function getRessourcesAdmin(): Promise<RessourceAdmin[]> {
  const [rows, demandes] = await Promise.all([
    prisma.resource.findMany({
      include: { _count: { select: { commentaires: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.auditLog.groupBy({
      by: ["entiteId"],
      where: { action: "ressource_achetee" },
      _count: { _all: true },
    }),
  ]);
  const parRessource = new Map(
    demandes.map((d) => [d.entiteId, d._count._all]),
  );
  return rows.map((r) => ({
    id: r.id,
    titre: r.titre,
    cat: RESOURCE_CAT_LABEL[r.cat],
    fmt: r.fmt,
    taille: r.taille,
    date: r.date.toISOString().slice(0, 10),
    type: r.type,
    prix: r.prix,
    description: r.description,
    pret:
      r.fmt === "page" ||
      (Boolean(r.fichier) && (r.fmt === "video" || Boolean(r.pages))),
    pages: r.pages,
    cover: r.cover,
    dossierId: r.dossierId,
    commentaires: r._count.commentaires,
    demandes: parRessource.get(r.id) ?? 0,
  }));
}

export async function getBlocsRessource(id: string): Promise<Bloc[]> {
  const r = await prisma.resource.findUnique({
    where: { id },
    select: { contenu: true },
  });
  return blocsEnregistres(r?.contenu);
}

export interface CompteEquipe {
  id: string;
  nom: string;
  fonction: string;
  email: string;
  tel: string | null;
  photo: string | null;
  depuis: string;
  sansMotDePasse: boolean;
  niveau: NiveauEquipe;
}

export async function getAdministrateurs(): Promise<CompteEquipe[]> {
  const rows = await prisma.user.findMany({
    where: { role: "admin" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      nom: true,
      fonction: true,
      email: true,
      tel: true,
      photo: true,
      createdAt: true,
      motDePasse: true,
      niveauEquipe: true,
    },
  });
  return rows.map((u) => ({
    id: u.id,
    nom: u.nom,
    fonction: u.fonction,
    email: u.email,
    tel: u.tel,
    photo: u.photo,
    depuis: u.createdAt.toISOString().slice(0, 10),
    sansMotDePasse: !u.motDePasse,
    niveau: u.niveauEquipe ?? "manager",
  }));
}

export interface CompteMembre extends Omit<CompteEquipe, "niveau"> {
  membre: {
    id: string;
    nom: string;
    statut: MemberStatus;
    motivation: string | null;
    sansHistorique: boolean;
  } | null;
}

const compteMembreSelect = {
  id: true,
  nom: true,
  fonction: true,
  email: true,
  tel: true,
  photo: true,
  createdAt: true,
  motDePasse: true,
  member: {
    select: {
      id: true,
      nom: true,
      statut: true,
      motivation: true,
      _count: {
        select: { factures: true, inscriptions: true, produits: true },
      },
    },
  },
} as const;

type LigneCompte = {
  id: string;
  nom: string;
  fonction: string;
  email: string;
  tel: string | null;
  photo: string | null;
  createdAt: Date;
  motDePasse: string | null;
  member: {
    id: string;
    nom: string;
    statut: MemberStatus;
    motivation: string | null;
    _count: { factures: number; inscriptions: number; produits: number };
  } | null;
};

function versCompteMembre(u: LigneCompte): CompteMembre {
  return {
    id: u.id,
    nom: u.nom,
    fonction: u.fonction,
    email: u.email,
    tel: u.tel,
    photo: u.photo,
    depuis: u.createdAt.toISOString().slice(0, 10),
    sansMotDePasse: !u.motDePasse,
    membre: u.member
      ? {
          id: u.member.id,
          nom: u.member.nom,
          statut: u.member.statut,
          motivation: u.member.motivation,
          sansHistorique:
            u.member._count.factures === 0 &&
            u.member._count.inscriptions === 0 &&
            u.member._count.produits === 0,
        }
      : null,
  };
}

export async function chercherComptes(
  recherche: string,
  limite = 20,
): Promise<CompteMembre[]> {
  const q = recherche.trim();
  if (!q) return [];
  const rows = await prisma.user.findMany({
    where: {
      role: { in: ["membre", "visiteur"] },
      OR: [
        { nom: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { member: { nom: { contains: q, mode: "insensitive" } } },
      ],
    },
    orderBy: { nom: "asc" },
    take: limite,
    select: compteMembreSelect,
  });
  return rows.map(versCompteMembre);
}

export interface AccesOuvert {
  memberId: string;
  nom: string;
  ouvertPar: string;
  date: string;
}

export async function getAccesRessource(
  resourceId: string,
): Promise<AccesOuvert[]> {
  await exigerEquipe();
  const rows = await prisma.accesRessource.findMany({
    where: { resourceId },
    include: { member: { select: { nom: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((a) => ({
    memberId: a.memberId,
    nom: a.member.nom,
    ouvertPar: a.ouvertPar,
    date: a.createdAt.toISOString(),
  }));
}

export async function getMembresPourAcces(): Promise<
  { id: string; nom: string; statut: string }[]
> {
  await exigerEquipe();
  const rows = await prisma.member.findMany({
    where: { statut: { notIn: ["candidature", "en_attente"] } },
    orderBy: { nom: "asc" },
    select: { id: true, nom: true, statut: true },
  });
  return rows;
}

export async function getAccesDesRessources(
  ids: string[],
): Promise<Record<string, AccesOuvert[]>> {
  if (!ids.length) return {};
  await exigerEquipe();
  const rows = await prisma.accesRessource.findMany({
    where: { resourceId: { in: ids } },
    include: { member: { select: { nom: true } } },
    orderBy: { createdAt: "desc" },
  });
  const par: Record<string, AccesOuvert[]> = {};
  for (const a of rows) {
    (par[a.resourceId] ??= []).push({
      memberId: a.memberId,
      nom: a.member.nom,
      ouvertPar: a.ouvertPar,
      date: a.createdAt.toISOString(),
    });
  }
  return par;
}
