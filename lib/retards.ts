export type Restriction = "lecture" | "blocage";
export type ReglagesRetard = { delaiRetard: number; relances: number[]; actionRetard: Restriction };
type Facture = { date: Date; payeeLe: Date | null; suivie: boolean };

export const REGLAGES_PAR_DEFAUT: ReglagesRetard = { delaiRetard: 15, relances: [1, 7, 14], actionRetard: "lecture" };

const jourUTC = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
export const joursDepuis = (date: Date, maintenant: Date) => Math.floor((jourUTC(maintenant) - jourUTC(date)) / 86_400_000);

export function etatRetard(factures: Facture[], r: ReglagesRetard, maintenant = new Date()) {
  const impayees = factures.filter((f) => f.suivie && !f.payeeLe).sort((a, b) => a.date.getTime() - b.date.getTime());
  if (!impayees.length) return { enRetard: false, jours: 0, restriction: null as Restriction | null };
  const jours = joursDepuis(impayees[0].date, maintenant);
  return {
    enRetard: jours >= 1,
    jours,
    restriction: r.delaiRetard > 0 && jours > r.delaiRetard ? r.actionRetard : null,
  };
}

export function relanceDue(f: { date: Date; relances: number[] }, r: Pick<ReglagesRetard, "relances">, maintenant = new Date()): number | null {
  const jours = joursDepuis(f.date, maintenant);
  const dues = r.relances.filter((d) => d <= jours && !f.relances.includes(d));
  return dues.length ? Math.max(...dues) : null;
}

export function lireRelances(saisie: string): number[] | null {
  const morceaux = saisie.split(/[\s,;]+/).filter(Boolean);
  const jours = morceaux.map(Number);
  if (jours.some((j) => !Number.isInteger(j) || j < 1 || j > 365)) return null;
  return [...new Set(jours)].sort((a, b) => a - b).slice(0, 10);
}
