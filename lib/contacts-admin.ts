import "server-only";

import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { conditionsContacts, type FiltresContacts } from "@/lib/filtres-contacts";

export { lireFiltresContacts, parametresContacts, type FiltresContacts } from "@/lib/filtres-contacts";

// Tous les tags posés sur des contacts, dans l'ordre alphabétique
export async function getTagsContacts(): Promise<string[]> {
  const cs = await prisma.user.findMany({
    where: { role: "membre", memberId: { not: null }, etiquettes: { isEmpty: false } },
    select: { etiquettes: true },
  });
  return [...new Set(cs.flatMap((c) => c.etiquettes))].sort((a, b) => a.localeCompare(b, "fr"));
}

// Tous les tags qui existent : créés par l'équipe (même sans contact) ou posés sur un contact
export async function getTousLesTags(): Promise<string[]> {
  const [crees, poses] = await Promise.all([prisma.tag.findMany({ select: { nom: true } }), getTagsContacts()]);
  return [...new Set([...crees.map((t) => t.nom), ...poses])].sort((a, b) => a.localeCompare(b, "fr"));
}

// Tous les contacts des entreprises membres (comptes « membre »), pour la page Contacts de l'équipe
export async function getTousContacts(f: FiltresContacts) {
  const rows = await prisma.user.findMany({
    where: { role: "membre", memberId: { not: null }, AND: conditionsContacts(f) as Prisma.UserWhereInput[] },
    select: {
      id: true, nom: true, fonction: true, email: true, tel: true, photo: true, contactPrincipal: true,
      motDePasse: true, etiquettes: true, member: { select: { id: true, nom: true, statut: true } },
    },
    orderBy: [{ member: { nom: "asc" } }, { contactPrincipal: "desc" }, { nom: "asc" }],
  });
  return rows.map(({ motDePasse, ...c }) => ({ ...c, actif: !!motDePasse }));
}
