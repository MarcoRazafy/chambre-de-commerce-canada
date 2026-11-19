import "server-only";

import { prisma } from "@/lib/db";
import type { Formule } from "@/lib/membership";

const champs = { id: true, pays: true, profil: true, montant: true, devise: true } as const;

export function getFormules(): Promise<Formule[]> {
  return prisma.formuleAdhesion.findMany({ where: { active: true }, orderBy: [{ ordre: "asc" }, { createdAt: "asc" }], select: champs });
}

export async function formuleProposee(id: string | null | undefined): Promise<Formule | null> {
  if (!id) return null;
  return prisma.formuleAdhesion.findFirst({ where: { id, active: true }, select: champs });
}

export const SELECT_FORMULE = { select: champs } as const;
