import "server-only";

import { prisma } from "@/lib/db";
import { toISODate } from "@/lib/enums";
import { aujourdhuiISO } from "@/lib/format";
import { maintenant } from "@/lib/presences";
import {
  couleurType,
  creneauxLibres,
  joursOuverts,
  lireLieu,
  type Lieu,
  type Occupe,
  type Plage,
  type StatutRendezvous,
} from "@/lib/rendezvous";

// La personne de l'équipe qui reçoit ; null : « l'équipe CanCham »
export interface Hote {
  id: string;
  nom: string;
  fonction: string;
  specialite: string | null;
  photo: string | null;
}

export interface TypeRendezvous {
  id: string;
  titre: string;
  detail: string | null;
  duree: number;
  actif: boolean;
  plages: (Plage & { id: string })[];
  hote: Hote | null;
  lieu: Lieu;
  couleur: string;
  prix: string | null;
  aConfirmer: boolean;
}

export interface RendezvousPris {
  id: string;
  jour: string;
  debut: string;
  fin: string;
  motif: string | null;
  type: { id: string; titre: string; duree: number; couleur: string };
  personne: { nom: string; email: string; tel: string | null };
  entreprise: string | null;
  hote: { id: string; nom: string } | null;
  lieu: Lieu;
  lienVisio: string | null;
  statut: StatutRendezvous;
  annule: boolean;
  annulePar: string | null;
}

const HOTE = { select: { id: true, nom: true, fonction: true, specialite: true, photo: true } } as const;

const CHAMPS = {
  id: true,
  jour: true,
  debut: true,
  fin: true,
  motif: true,
  annuleLe: true,
  annulePar: true,
  statut: true,
  lieu: true,
  lienVisio: true,
  type: { select: { id: true, titre: true, duree: true, couleur: true, ordre: true } },
  user: { select: { nom: true, email: true, tel: true } },
  member: { select: { nom: true } },
  hote: { select: { id: true, nom: true } },
} as const;

type Ligne = {
  id: string;
  jour: Date;
  debut: string;
  fin: string;
  motif: string | null;
  annuleLe: Date | null;
  annulePar: string | null;
  statut: string;
  lieu: string;
  lienVisio: string | null;
  type: { id: string; titre: string; duree: number; couleur: string | null; ordre: number };
  user: { nom: string; email: string; tel: string | null };
  member: { nom: string } | null;
  hote: { id: string; nom: string } | null;
};

function versRendezvous(r: Ligne): RendezvousPris {
  return {
    id: r.id,
    jour: toISODate(r.jour),
    debut: r.debut,
    fin: r.fin,
    motif: r.motif,
    type: { id: r.type.id, titre: r.type.titre, duree: r.type.duree, couleur: couleurType(r.type.couleur, r.type.ordre) },
    personne: r.user,
    entreprise: r.member?.nom ?? null,
    hote: r.hote,
    lieu: lireLieu(r.lieu),
    lienVisio: r.lienVisio,
    statut: r.annuleLe ? "annule" : r.statut === "a_confirmer" ? "a_confirmer" : "confirme",
    annule: r.annuleLe !== null,
    annulePar: r.annulePar,
  };
}

// Types de rendez-vous. Pour les membres (tous = false) : ceux proposés, dont la personne reçoit
export async function getTypesRendezvous(tous = false): Promise<TypeRendezvous[]> {
  const lignes = await prisma.typeRendezvous.findMany({
    where: tous ? undefined : { actif: true, OR: [{ hoteId: null }, { hote: { recoitRdv: true } }] },
    orderBy: [{ ordre: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      titre: true,
      detail: true,
      duree: true,
      actif: true,
      ordre: true,
      lieu: true,
      couleur: true,
      prix: true,
      aConfirmer: true,
      hote: HOTE,
      plages: {
        orderBy: [{ jour: "asc" }, { debut: "asc" }],
        select: { id: true, jour: true, debut: true, fin: true },
      },
    },
  });
  return lignes.map(({ ordre, lieu, couleur, ...t }) => ({ ...t, lieu: lireLieu(lieu), couleur: couleurType(couleur, ordre) }));
}

export async function getPlages(typeId: string): Promise<(Plage & { id: string })[]> {
  return prisma.disponibilite.findMany({
    where: { typeId },
    orderBy: [{ jour: "asc" }, { debut: "asc" }],
    select: { id: true, jour: true, debut: true, fin: true },
  });
}

// Créneaux déjà pris par la même personne (ou par « l'équipe ») : chacun a son propre agenda
export async function occupesPour(hoteId: string | null, du: string, au: string): Promise<Map<string, Occupe[]>> {
  const pris = await prisma.rendezvous.findMany({
    where: {
      annuleLe: null,
      hoteId,
      jour: { gte: new Date(`${du}T00:00:00Z`), lte: new Date(`${au}T00:00:00Z`) },
    },
    select: { jour: true, debut: true, fin: true },
  });
  const par = new Map<string, Occupe[]>();
  for (const p of pris) {
    const jour = toISODate(p.jour);
    par.set(jour, [...(par.get(jour) ?? []), { debut: p.debut, fin: p.fin }]);
  }
  return par;
}

export interface JourProposable {
  jour: string;
  creneaux: string[];
}

export async function getCreneaux(type: {
  id: string;
  duree: number;
  plages?: Plage[];
  hote?: { id: string } | null;
}): Promise<JourProposable[]> {
  const plages = type.plages ?? (await getPlages(type.id));
  const depuis = aujourdhuiISO();
  const jours = joursOuverts(depuis, plages);
  if (!jours.length) return [];

  const pris = await occupesPour(type.hote?.id ?? null, jours[0], jours[jours.length - 1]);
  const instant = maintenant();
  return jours
    .map((jour) => ({
      jour,
      creneaux: creneauxLibres({ jour, plages, duree: type.duree, occupes: pris.get(jour) ?? [], maintenant: instant }),
    }))
    .filter((j) => j.creneaux.length > 0);
}

const ordre = [{ jour: "asc" as const }, { debut: "asc" as const }];

export async function getMesRendezvous(userId: string): Promise<RendezvousPris[]> {
  const lignes = await prisma.rendezvous.findMany({
    where: { userId, annuleLe: null, jour: { gte: new Date(`${aujourdhuiISO()}T00:00:00Z`) } },
    orderBy: ordre,
    select: CHAMPS,
  });
  return lignes.map(versRendezvous);
}

export async function getRendezvous(id: string): Promise<(RendezvousPris & { userId: string }) | null> {
  const r = await prisma.rendezvous.findUnique({ where: { id }, select: { ...CHAMPS, userId: true } });
  return r ? { ...versRendezvous(r), userId: r.userId } : null;
}

export type PeriodeRendezvous = "a_venir" | "passes" | "annules";

// Liste de l'équipe : à venir (du plus proche), passés ou annulés (du plus récent), pour une personne ou toutes
export async function getRendezvousEquipe(
  { periode = "a_venir", hote = "" }: { periode?: PeriodeRendezvous; hote?: string } = {},
): Promise<RendezvousPris[]> {
  const aujourdhui = new Date(`${aujourdhuiISO()}T00:00:00Z`);
  const lignes = await prisma.rendezvous.findMany({
    where: {
      ...(periode === "annules"
        ? { annuleLe: { not: null } }
        : { annuleLe: null, jour: periode === "passes" ? { lt: aujourdhui } : { gte: aujourdhui } }),
      ...(hote === "equipe" ? { hoteId: null } : hote ? { hoteId: hote } : {}),
    },
    orderBy: periode === "a_venir" ? ordre : [{ jour: "desc" }, { debut: "desc" }],
    take: 200,
    select: CHAMPS,
  });
  return lignes.map(versRendezvous);
}

export async function getRendezvousAgenda(du: string, au: string, userId?: string): Promise<RendezvousPris[]> {
  const lignes = await prisma.rendezvous.findMany({
    where: {
      annuleLe: null,
      ...(userId ? { userId } : {}),
      jour: { gte: new Date(`${du}T00:00:00Z`), lte: new Date(`${au}T00:00:00Z`) },
    },
    orderBy: ordre,
    select: CHAMPS,
  });
  return lignes.map(versRendezvous);
}

// Les comptes de l'équipe, et ce qu'ils reçoivent
export interface PersonneEquipe extends Hote {
  email: string;
  lienVisio: string | null;
  recoit: boolean;
  types: number;
}

export async function getPersonnesEquipe(): Promise<PersonneEquipe[]> {
  const lignes = await prisma.user.findMany({
    where: { role: "admin" },
    orderBy: [{ recoitRdv: "desc" }, { createdAt: "asc" }],
    select: {
      id: true, nom: true, fonction: true, specialite: true, photo: true, email: true, lienVisio: true, recoitRdv: true,
      _count: { select: { typesRdv: true } },
    },
  });
  return lignes.map(({ recoitRdv, _count, ...u }) => ({ ...u, recoit: recoitRdv, types: _count.typesRdv }));
}
