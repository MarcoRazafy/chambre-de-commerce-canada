// Newsletter : règles sans dépendance au serveur (état d'une lettre, taux, programmation, abonnés, import CSV)

import { FUSEAU_CHAMBRE } from "@/lib/rendezvous";

export type EtatLettre = "brouillon" | "programmee" | "envoyee";

// Une lettre programmée le reste jusqu'à ce que le serveur l'envoie (« envoi » : en cours, compté comme partie)
export function etatLettre(l: { statut: string; programmeeLe: Date | null }): EtatLettre {
  if (l.statut === "envoyee" || l.statut === "envoi") return "envoyee";
  if (l.statut === "programmee") return "programmee";
  return "brouillon";
}

// Date d'envoi affichée : celle de l'envoi immédiat ou celle de la programmation
export function dateEnvoi(l: { envoyeeLe: Date | null; programmeeLe: Date | null }): Date | null {
  return l.programmeeLe ?? l.envoyeeLe;
}

// Le serveur passe toutes les 5 minutes : une lettre part au plus 5 minutes après l'heure choisie
export const DELAI_MIN_MINUTES = 5;
export const DELAI_MAX_JOURS = 90;

// « 2026-11-20T09:00 » (champ date et heure, heure de Madagascar) → instant ; erreur lisible sinon
export function lireProgrammation(
  saisie: string,
  maintenant = new Date(),
): { date: Date } | { erreur: string } {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(saisie)) return { erreur: "Choisissez la date et l’heure de l’envoi." };
  const date = new Date(`${saisie}:00${FUSEAU_CHAMBRE}`);
  if (Number.isNaN(date.getTime())) return { erreur: "Date d’envoi invalide." };
  if (date.getTime() < maintenant.getTime() + DELAI_MIN_MINUTES * 60_000) {
    return { erreur: `Choisissez une heure au moins ${DELAI_MIN_MINUTES} minutes plus tard ; pour partir tout de suite, utilisez « Envoyer maintenant ».` };
  }
  if (date.getTime() > maintenant.getTime() + DELAI_MAX_JOURS * 86_400_000) {
    return { erreur: `Un envoi se programme au plus ${DELAI_MAX_JOURS} jours à l’avance.` };
  }
  return { date };
}

// Valeur par défaut du champ : demain à 9 h, heure de Madagascar
export function programmationParDefaut(maintenant = new Date()): string {
  const demain = new Date(maintenant.getTime() + 86_400_000 + 3 * 3_600_000);
  return `${demain.toISOString().slice(0, 10)}T09:00`;
}

const FORMAT_DATE_HEURE = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Indian/Antananarivo",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
export function fmtDateHeure(d: Date): string {
  return FORMAT_DATE_HEURE.format(d).replace(":", " h ");
}

// Statistiques d'une lettre à partir de ses envois suivis ; null tant qu'il n'y a rien à mesurer
export type SuiviLettre = { envoyes: number; livres: number; ouverts: number; clics: number; erreurs: number };
export function suiviDe(envois: { livreLe: Date | null; ouvertLe: Date | null; clicLe: Date | null; erreurLe: Date | null }[]): SuiviLettre {
  return {
    envoyes: envois.length,
    livres: envois.filter((e) => e.livreLe).length,
    ouverts: envois.filter((e) => e.ouvertLe || e.clicLe).length,
    clics: envois.filter((e) => e.clicLe).length,
    erreurs: envois.filter((e) => e.erreurLe).length,
  };
}
export const taux = (n: number, sur: number): number | null => (sur > 0 ? (n / sur) * 100 : null);
export function moyenne(valeurs: (number | null)[]): number | null {
  const v = valeurs.filter((x): x is number => x !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}
export function fmtTaux(t: number | null): string {
  return t === null ? "—" : `${(Math.round(t * 10) / 10).toString().replace(".", ",")} %`;
}

