import "server-only";

import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { MemberStatus, MemberType } from "@/lib/types";
import { conditionsContacts, type FiltresContacts } from "@/lib/filtres-contacts";

export { lireFiltresContacts, parametresContacts, type FiltresContacts } from "@/lib/filtres-contacts";

// Une entreprise membre, représentée par son contact principal (à défaut, son premier contact)
export interface EntrepriseContact {
  id: string;
  nom: string;
  type: MemberType;
  secteur: string;
  ville: string;
  statut: MemberStatus;
  photo: string | null;
  logo: string | null;
  etiquettes: string[];
  contact: { nom: string; fonction: string; email: string; tel: string | null; actif: boolean } | null;
}

const CHAMPS = {
  id: true,
  nom: true,
  type: true,
  secteur: true,
  ville: true,
  statut: true,
  photo: true,
  logo: true,
  etiquettes: true,
  users: {
    where: { role: "membre" as const },
    orderBy: [{ contactPrincipal: "desc" as const }, { createdAt: "asc" as const }],
    take: 1,
    select: { nom: true, fonction: true, email: true, tel: true, motDePasse: true },
  },
} satisfies Prisma.MemberSelect;

type Ligne = Prisma.MemberGetPayload<{ select: typeof CHAMPS }>;

function versEntreprise({ users, ...m }: Ligne): EntrepriseContact {
  const u = users[0];
  return {
    ...m,
    statut: m.statut as MemberStatus,
    type: m.type as MemberType,
    contact: u ? { nom: u.nom, fonction: u.fonction, email: u.email, tel: u.tel, actif: !!u.motDePasse } : null,
  };
}

// Les entreprises (sauf les demandes refusées), filtrées, dans l'ordre alphabétique
export async function getEntreprisesContacts(f?: FiltresContacts): Promise<EntrepriseContact[]> {
  const lignes = await prisma.member.findMany({
    where: { statut: { not: "refusee" }, ...(f ? { AND: conditionsContacts(f) as Prisma.MemberWhereInput[] } : {}) },
    select: CHAMPS,
    orderBy: { nom: "asc" },
  });
  return lignes.map(versEntreprise);
}

// Tous les tags posés sur des entreprises, dans l'ordre alphabétique
export async function getTagsEntreprises(): Promise<string[]> {
  const ms = await prisma.member.findMany({ where: { etiquettes: { isEmpty: false } }, select: { etiquettes: true } });
  return [...new Set(ms.flatMap((m) => m.etiquettes))].sort((a, b) => a.localeCompare(b, "fr"));
}

// Tous les tags qui existent : créés par l'équipe (même sans entreprise) ou posés sur une entreprise
export async function getTousLesTags(): Promise<string[]> {
  const [crees, poses] = await Promise.all([prisma.tag.findMany({ select: { nom: true } }), getTagsEntreprises()]);
  return [...new Set([...crees.map((t) => t.nom), ...poses])].sort((a, b) => a.localeCompare(b, "fr"));
}
