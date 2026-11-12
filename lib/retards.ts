// Retards de paiement de l'abonnement (réglés par l'Admin GM) : fonctions pures, testées.
// Une facture « suivie » impayée relance la Chambre les jours indiqués après sa date ; passé le délai,
// l'espace passe en lecture seule ou est bloqué, jusqu'au paiement.

export type Restriction = "lecture" | "blocage";
export type ReglagesRetard = { delaiRetard: number; relances: number[]; actionRetard: Restriction };
type Facture = { date: Date; payeeLe: Date | null; suivie: boolean };

export const REGLAGES_PAR_DEFAUT: ReglagesRetard = { delaiRetard: 15, relances: [1, 7, 14], actionRetard: "lecture" };

const jourUTC = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
// Jours pleins entre la date de la facture et aujourd'hui (0 le jour même)
export const joursDepuis = (date: Date, maintenant: Date) => Math.floor((jourUTC(maintenant) - jourUTC(date)) / 86_400_000);

// L'état d'une Chambre : la plus ancienne facture suivie impayée décide
export function etatRetard(factures: Facture[], r: ReglagesRetard, maintenant = new Date()) {
  const impayees = factures.filter((f) => f.suivie && !f.payeeLe).sort((a, b) => a.date.getTime() - b.date.getTime());
  if (!impayees.length) return { enRetard: false, jours: 0, restriction: null as Restriction | null };
  const jours = joursDepuis(impayees[0].date, maintenant);
  return {
    enRetard: jours >= 1,
    jours,
    // Délai 0 : jamais de restriction automatique
    restriction: r.delaiRetard > 0 && jours > r.delaiRetard ? r.actionRetard : null,
  };
}

// La relance à envoyer pour une facture impayée (la plus récente due, une seule fois), ou null
export function relanceDue(f: { date: Date; relances: number[] }, r: ReglagesRetard, maintenant = new Date()): number | null {
  const jours = joursDepuis(f.date, maintenant);
  const dues = r.relances.filter((d) => d <= jours && !f.relances.includes(d));
  return dues.length ? Math.max(...dues) : null;
}

// Les jours de relance saisis (« 1, 7, 14 ») : entiers de 1 à 365, triés, sans doublon
export function lireRelances(saisie: string): number[] | null {
  const morceaux = saisie.split(/[\s,;]+/).filter(Boolean);
  const jours = morceaux.map(Number);
  if (jours.some((j) => !Number.isInteger(j) || j < 1 || j > 365)) return null;
  return [...new Set(jours)].sort((a, b) => a - b).slice(0, 10);
}
