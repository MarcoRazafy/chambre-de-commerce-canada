import "server-only";

import { prisma } from "@/lib/db";

// Tous les contacts des entreprises membres (comptes « membre »), pour la page Contacts de l'équipe
export type FiltresContacts = { q: string; principal: boolean; acces: "" | "actif" | "invite" };

export function lireFiltresContacts(p: Record<string, string | undefined>): FiltresContacts {
  return {
    q: (p.q ?? "").trim(),
    principal: p.principal === "1",
    acces: p.acces === "actif" || p.acces === "invite" ? p.acces : "",
  };
}

export async function getTousContacts(f: FiltresContacts) {
  const mots = f.q ? { contains: f.q, mode: "insensitive" as const } : undefined;
  const rows = await prisma.user.findMany({
    where: {
      role: "membre",
      memberId: { not: null },
      ...(f.principal ? { contactPrincipal: true } : {}),
      ...(f.acces === "actif" ? { motDePasse: { not: null } } : f.acces === "invite" ? { motDePasse: null } : {}),
      ...(mots ? { OR: [{ nom: mots }, { email: mots }, { fonction: mots }, { tel: mots }, { member: { nom: mots } }] } : {}),
    },
    select: {
      id: true, nom: true, fonction: true, email: true, tel: true, photo: true, contactPrincipal: true,
      motDePasse: true, member: { select: { id: true, nom: true, statut: true } },
    },
    orderBy: [{ member: { nom: "asc" } }, { contactPrincipal: "desc" }, { nom: "asc" }],
  });
  return rows.map(({ motDePasse, ...c }) => ({ ...c, actif: !!motDePasse }));
}
