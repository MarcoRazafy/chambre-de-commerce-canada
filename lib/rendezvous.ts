import { ajouterJours, enMinutes, estHeure } from "@/lib/agenda";

export const FUSEAU_CHAMBRE = "+03:00";

export const MENTION_FUSEAU = "heure de Madagascar (UTC+3)";

export const DELAI_PREVENANCE_H = 4;

export const HORIZON_JOURS = 30;

export const JOURS_SEMAINE: { cle: number; libelle: string }[] = [
  { cle: 1, libelle: "Lundi" },
  { cle: 2, libelle: "Mardi" },
  { cle: 3, libelle: "Mercredi" },
  { cle: 4, libelle: "Jeudi" },
  { cle: 5, libelle: "Vendredi" },
  { cle: 6, libelle: "Samedi" },
  { cle: 7, libelle: "Dimanche" },
];

export interface Plage {
  jour: number;
  debut: string;
  fin: string;
}

export interface Occupe {
  debut: string;
  fin: string;
}

export function jourSemaine(iso: string): number {
  const d = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

export function versHeure(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export const finCreneau = (debut: string, duree: number) =>
  versHeure(enMinutes(debut) + duree);

export function chevauche(a: Occupe, b: Occupe): boolean {
  return (
    enMinutes(a.debut) < enMinutes(b.fin) &&
    enMinutes(b.debut) < enMinutes(a.fin)
  );
}

export function creneauxLibres({
  jour,
  plages,
  duree,
  occupes = [],
  maintenant,
}: {
  jour: string;
  plages: Plage[];
  duree: number;
  occupes?: Occupe[];
  maintenant?: number;
}): string[] {
  if (duree <= 0) return [];
  const duJour = plages.filter(
    (p) => p.jour === jourSemaine(jour) && estHeure(p.debut) && estHeure(p.fin),
  );

  const limite =
    maintenant === undefined
      ? null
      : maintenant + DELAI_PREVENANCE_H * 60 * 60 * 1000;

  const creneaux: string[] = [];
  for (const plage of duJour) {
    const fin = enMinutes(plage.fin);
    for (let m = enMinutes(plage.debut); m + duree <= fin; m += duree) {
      const debut = versHeure(m);
      const creneau = { debut, fin: versHeure(m + duree) };
      if (occupes.some((o) => chevauche(creneau, o))) continue;
      if (limite !== null) {
        const quand = Date.parse(`${jour}T${debut}:00${FUSEAU_CHAMBRE}`);
        if (quand < limite) continue;
      }
      creneaux.push(debut);
    }
  }
  return [...new Set(creneaux)].sort();
}

export function joursOuverts(depuis: string, plages: Plage[]): string[] {
  const ouverts = new Set(plages.map((p) => p.jour));
  const jours: string[] = [];
  for (let i = 0; i < HORIZON_JOURS; i++) {
    const jour = ajouterJours(depuis, i);
    if (ouverts.has(jourSemaine(jour))) jours.push(jour);
  }
  return jours;
}

// Où se tient un rendez-vous
export type Lieu = "visio" | "bureau" | "telephone";
export const LIEUX: { cle: Lieu; libelle: string; detail: string }[] = [
  { cle: "visio", libelle: "Visio", detail: "En visio : le lien est dans la confirmation" },
  { cle: "bureau", libelle: "Bureau de la CanCham", detail: "Dans les locaux de la CanCham" },
  { cle: "telephone", libelle: "Téléphone", detail: "Par téléphone : la personne vous appelle" },
];
export const lireLieu = (v: unknown): Lieu => (v === "visio" || v === "telephone" ? v : "bureau");
export const libelleLieu = (v: string) => LIEUX.find((l) => l.cle === lireLieu(v))!;

// Couleurs de repère des types, dans la palette de la plateforme
export const COULEURS_TYPE = ["#B5202B", "#2E7247", "#1B3A6B", "#A0630E", "#5B3FA8", "#0F7C80"];
export const couleurType = (couleur: string | null | undefined, rang = 0) =>
  couleur && /^#[0-9a-f]{6}$/i.test(couleur) ? couleur : COULEURS_TYPE[Math.abs(rang) % COULEURS_TYPE.length];

export const PRIX_SUGGERES = ["Gratuit", "Inclus dans l’adhésion"];

export type StatutRendezvous = "a_confirmer" | "confirme" | "annule";

// Calendrier d'un mois (« AAAA-MM ») : les jours, précédés de cases vides pour commencer un lundi
export function grilleMois(mois: string): (string | null)[] {
  const [a, m] = mois.split("-").map(Number);
  const premier = `${mois}-01`;
  const decalage = jourSemaine(premier) - 1;
  const nbJours = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return [
    ...Array<null>(decalage).fill(null),
    ...Array.from({ length: nbJours }, (_, i) => `${mois}-${String(i + 1).padStart(2, "0")}`),
  ];
}
export const moisDe = (jour: string) => jour.slice(0, 7);
export function moisVoisin(mois: string, sens: -1 | 1): string {
  const [a, m] = mois.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + sens, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
export const estMois = (v: unknown): v is string => typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

// « Mar, Jeu · 14:00 – 17:00 » : les jours qui partagent les mêmes heures d'accueil sont regroupés
const JOURS_COURTS = ["", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
export function resumePlages(plages: Plage[]): string {
  const groupes = new Map<string, number[]>();
  for (const p of [...plages].sort((a, b) => a.jour - b.jour || a.debut.localeCompare(b.debut))) {
    const cle = `${p.debut} – ${p.fin}`;
    groupes.set(cle, [...(groupes.get(cle) ?? []), p.jour]);
  }
  return [...groupes]
    .map(([heures, jours]) => `${[...new Set(jours)].map((j) => JOURS_COURTS[j]).join(", ")} · ${heures}`)
    .join(" ; ");
}
