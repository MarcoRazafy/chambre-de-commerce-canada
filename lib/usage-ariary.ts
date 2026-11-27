import "server-only";

import { prisma } from "@/lib/db";

export async function usageAriary(): Promise<boolean> {
  const [factures, formules, portefeuilles] = await Promise.all([
    prisma.invoice.count({ where: { devise: "MGA" } }),
    prisma.formuleAdhesion.count({ where: { devise: "MGA" } }),
    prisma.coordonneesPaiement.findFirst({ select: { mvola: true, orangeMoney: true, airtelMoney: true } }).catch(() => null),
  ]);
  const portefeuille = portefeuilles ? Object.values(portefeuilles).some((v) => (typeof v === "string" ? v.trim() : v)) : false;
  return factures + formules > 0 || portefeuille;
}
