import "server-only";

import { prisma } from "@/lib/db";
import { numeroFacture } from "@/lib/factures";
import { jourBase } from "@/lib/format";
import {
  FORMULES,
  fmtMontant,
  libelleFormule,
  type Devise,
  type FormuleId,
} from "@/lib/membership";
import { MONTANT_MINIMUM_EN_LIGNE, vanillaPayActif } from "@/lib/vanillapay";

export const OBJET_ADHESION = "Cotisation annuelle — adhésion";
export const OBJET_RENOUVELLEMENT = "Cotisation annuelle";

const STATUTS_DUS = ["en_attente", "en_retard"];

const COTISATION = {
  objet: { startsWith: "Cotisation", mode: "insensitive" },
} as const;

export interface CotisationDue {
  formule: string | null;
  montant: number | null;
  devise: Devise;
  somme: string | null;
  enLigne: boolean;
}

export function payableEnLigne(montant: number, devise: Devise): boolean {
  return (
    vanillaPayActif() && devise === "MGA" && montant >= MONTANT_MINIMUM_EN_LIGNE
  );
}

export function cotisationEnLigne(formule: FormuleId | null): boolean {
  if (!formule) return false;
  const tarif = FORMULES[formule];
  return payableEnLigne(tarif.montant, tarif.devise);
}

export function factureCotisationOuverte(memberId: string) {
  return prisma.invoice.findFirst({
    where: { memberId, statut: "envoyee", ...COTISATION },
    orderBy: { date: "desc" },
    select: { id: true, numero: true, montant: true, devise: true },
  });
}

export async function cotisationDue(m: {
  id: string;
  statut: string;
  formule: FormuleId | null;
}): Promise<CotisationDue | null> {
  if (!STATUTS_DUS.includes(m.statut)) return null;

  const ouverte = await factureCotisationOuverte(m.id);
  const tarif = m.formule ? FORMULES[m.formule] : null;
  const montant = ouverte?.montant ?? tarif?.montant ?? null;
  const devise: Devise = ouverte?.devise ?? tarif?.devise ?? "CAD";

  return {
    formule: m.formule ? libelleFormule(m.formule) : null,
    montant,
    devise,
    somme: montant === null ? null : fmtMontant(montant, devise),
    enLigne: montant !== null && payableEnLigne(montant, devise),
  };
}

export async function ouvrirFactureCotisation(memberId: string) {
  const m = await prisma.member.findUnique({
    where: { id: memberId },
    select: { nom: true, statut: true, formule: true },
  });
  if (!m || !STATUTS_DUS.includes(m.statut)) return null;

  const ouverte = await factureCotisationOuverte(memberId);
  if (ouverte) return ouverte;
  if (!m.formule) return null;

  const tarif = FORMULES[m.formule];
  const date = jourBase();
  const dejaCotise = await prisma.invoice.count({
    where: { memberId, statut: "payee", ...COTISATION },
  });
  const objet = dejaCotise ? OBJET_RENOUVELLEMENT : OBJET_ADHESION;
  const numero = await numeroFacture(date);

  const [facture] = await prisma.$transaction([
    prisma.invoice.create({
      data: {
        numero,
        date,
        objet,
        montant: tarif.montant,
        devise: tarif.devise,
        statut: "envoyee",
        memberId,
      },
      select: { id: true, numero: true, montant: true, devise: true },
    }),
    prisma.auditLog.create({
      data: {
        action: "facture_emise",
        entite: "Invoice",
        entiteId: numero,
        acteur: m.nom,
        detail: `${fmtMontant(tarif.montant, tarif.devise)} à régler par ${m.nom} · ${objet} · émise au moment du règlement en ligne.`,
      },
    }),
  ]);
  return facture;
}
