import { parseISO, today } from "@/lib/format";
import type { Member, MemberStatus } from "@/lib/types";

export const PHOTOS_PAR_PRODUIT = 5;

export const BESOINS_PAR_FICHE = 15;

export const RETARD_BLOCAGE_JOURS = 30;

export const DELAI_REGLEMENT_JOURS = 30;

export type Devise = "MGA" | "CAD";

// Formule d'adhésion d'une Chambre (réglée dans ses Paramètres, lib/formules.ts) : « pays » est son titre
export type FormuleId = string;
export interface Formule {
  id: FormuleId;
  pays: string;
  profil: string;
  montant: number;
  devise: Devise;
}

export function libelleFormule(f: Formule | null | undefined): string {
  if (!f) return "Formule à choisir";
  return `${f.pays} — ${f.profil}`;
}

// Tarifs en dollars canadiens ; « Ar » pour les montants en ariary
export function fmtMontant(montant: number, devise: Devise): string {
  const nombre = montant.toLocaleString("fr-FR");
  return devise === "CAD" ? `${nombre} $` : `${nombre} Ar`;
}

export function fmtCotisation(f: Formule | null | undefined): string {
  if (!f) return "à définir";
  return fmtMontant(f.montant, f.devise);
}

export function cotisationAnnuelle(f: Formule | null | undefined): string {
  return f ? `${fmtCotisation(f)} / an` : "Cotisation à définir";
}

export const PAGES_TOUJOURS_OUVERTES = [
  "/membre/profil",
  "/membre/cotisations",
  "/membre/contact",
  "/membre/aide",
];

export const ADHESION_PENDING: MemberStatus[] = ["candidature", "en_attente"];

export const HORS_ANNUAIRE: MemberStatus[] = ["candidature", "refusee"];

export function joursDeRetard(m: Member | null | undefined): number {
  if (!m?.retardDepuis) return 0;
  const diff = today().getTime() - parseISO(m.retardDepuis).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

export function retardBloque(m: Member | null | undefined): boolean {
  return (
    !!m && m.statut === "en_retard" && joursDeRetard(m) > RETARD_BLOCAGE_JOURS
  );
}

export function isAccessLocked(m: Member | null | undefined): boolean {
  if (!m) return false;
  return ADHESION_PENDING.includes(m.statut) || retardBloque(m);
}

export type LockReason = "adhesion_en_attente" | "retard_bloquant" | null;

export function lockReason(m: Member | null | undefined): LockReason {
  if (!m) return null;
  if (ADHESION_PENDING.includes(m.statut)) return "adhesion_en_attente";
  if (retardBloque(m)) return "retard_bloquant";
  return null;
}

export function isOverdueWarning(m: Member | null | undefined): boolean {
  return !!m && m.statut === "en_retard" && !retardBloque(m);
}
