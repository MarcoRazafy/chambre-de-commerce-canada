import { parseISO, today } from "@/lib/format";
import type { Member, MemberStatus } from "@/lib/types";

export const PHOTOS_PAR_PRODUIT = 5;

export const BESOINS_PAR_FICHE = 15;

export const RETARD_BLOCAGE_JOURS = 30;

export const DELAI_REGLEMENT_JOURS = 30;

export type FormuleId =
  | "mg_consultant"
  | "mg_entreprise"
  | "ca_diaspora"
  | "ca_entreprise"
  | "sur_mesure";

export type Devise = "MGA" | "CAD";

export interface Formule {
  pays: string;
  profil: string;
  montant: number;
  devise: Devise;
}

export const FORMULES: Record<FormuleId, Formule> = {
  mg_consultant: {
    pays: "Madagascar",
    profil: "Consultant, groupement et ONG",
    montant: 75,
    devise: "CAD",
  },
  mg_entreprise: {
    pays: "Madagascar",
    profil: "Entreprise",
    montant: 150,
    devise: "CAD",
  },
  ca_diaspora: {
    pays: "Canada",
    profil: "Diaspora & travailleur autonome",
    montant: 150,
    devise: "CAD",
  },
  ca_entreprise: {
    pays: "Canada",
    profil: "Entreprise canadienne",
    montant: 300,
    devise: "CAD",
  },
  sur_mesure: {
    pays: "Sur mesure",
    profil: "Partenaire & sponsor",
    montant: 1_000,
    devise: "CAD",
  },
};

export const ORDRE_FORMULES = Object.keys(FORMULES) as FormuleId[];

export function libelleFormule(id: FormuleId | null): string {
  if (!id) return "Formule à choisir";
  const f = FORMULES[id];
  return `${f.pays} — ${f.profil}`;
}

// Tarifs en dollars canadiens ; « Ar » ne sert plus qu'aux anciennes factures en Ariary
export function fmtMontant(montant: number, devise: Devise): string {
  const nombre = montant.toLocaleString("fr-FR");
  return devise === "CAD" ? `${nombre} $` : `${nombre} Ar`;
}

export function fmtCotisation(id: FormuleId | null): string {
  if (!id) return "à définir";
  const f = FORMULES[id];
  return fmtMontant(f.montant, f.devise);
}

export function cotisationAnnuelle(id: FormuleId | null): string {
  return id ? `${fmtCotisation(id)} / an` : "Cotisation à définir";
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
