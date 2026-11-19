import { FUSEAU_CHAMBRE } from "@/lib/rendezvous";

export type EtatLettre = "brouillon" | "programmee" | "envoyee";

export function etatLettre(l: { statut: string; programmeeLe: Date | null }): EtatLettre {
  if (l.statut === "envoyee" || l.statut === "envoi") return "envoyee";
  if (l.statut === "programmee") return "programmee";
  return "brouillon";
}

export function dateEnvoi(l: { envoyeeLe: Date | null; programmeeLe: Date | null }): Date | null {
  return l.programmeeLe ?? l.envoyeeLe;
}

export const DELAI_MIN_MINUTES = 5;
export const DELAI_MAX_JOURS = 90;

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

