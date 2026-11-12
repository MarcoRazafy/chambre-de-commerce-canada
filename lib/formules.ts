import "server-only";

// Formules d'adhésion de la Chambre en cours (Paramètres > Formules d'adhésion)
import { prisma } from "@/lib/db";
import type { Formule } from "@/lib/membership";

const champs = { id: true, pays: true, profil: true, montant: true, devise: true } as const;

// Les formules proposées (actives), dans leur ordre
export function getFormules(): Promise<Formule[]> {
  return prisma.formuleAdhesion.findMany({ where: { active: true }, orderBy: [{ ordre: "asc" }, { createdAt: "asc" }], select: champs });
}

// Une formule proposée de la Chambre (choix d'un membre, d'un formulaire), sinon null
export async function formuleProposee(id: string | null | undefined): Promise<Formule | null> {
  if (!id) return null;
  return prisma.formuleAdhesion.findFirst({ where: { id, active: true }, select: champs });
}

// Pour lire une formule depuis une requête Prisma (select / include)
export const SELECT_FORMULE = { select: champs } as const;
