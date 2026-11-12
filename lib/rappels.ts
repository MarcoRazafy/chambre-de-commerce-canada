import { docVide, sectionVide, type DocLettre, type Reseau, type Section, type PiedRegle } from "@/lib/lettre-blocs";
// Rappels automatiques aux inscrits d'un événement : quand chacun part, le texte du courriel.
// Sans dépendance au serveur.

import { FUSEAU_CHAMBRE } from "@/lib/rendezvous";

const MINUTE = 60_000;

// Ancien réglage d'un rappel : un délai en minutes avant le début
export const echeance = (avant: number, debut: number) => debut - avant * MINUTE;

// Dates d'envoi choisies par l'équipe, saisies à l'heure de Madagascar (« 2026-11-19T17:30 »)
export const DATES_MAX = 10;
const RETARD_MAX = 12 * 60 * MINUTE;

export function lireDateEnvoi(saisie: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(saisie)) return null;
  const t = Date.parse(`${saisie}:00${FUSEAU_CHAMBRE}`);
  return Number.isNaN(t) ? null : t;
}

// Un instant au format d'un champ date et heure, à l'heure de Madagascar
export function versSaisie(t: number): string {
  return new Date(t + 3 * 60 * MINUTE).toISOString().slice(0, 16);
}

// Les moments d'envoi d'un rappel : ses dates, sinon l'ancien délai avant le début
export function momentsEnvoi(r: { dates: Date[]; avant: number }, debut: number): number[] {
  if (r.dates.length) return r.dates.map((d) => d.getTime()).sort((a, b) => a - b);
  return r.avant > 0 ? [echeance(r.avant, debut)] : [];
}

// Une date d'envoi est due une fois son heure venue, avec 12 heures de rattrapage au plus,
// et jamais une fois l'événement commencé
export function estDuA(moment: number, debut: number, maintenant: number): boolean {
  return maintenant >= moment && maintenant < moment + RETARD_MAX && maintenant < debut;
}

// Chaque date d'un rappel est notée à part : une adresse la reçoit une seule fois
export const cleEnvoi = (rappelId: string, moment: number) => `${rappelId}@${new Date(moment).toISOString()}`;

// Début de l'événement, heure de Madagascar ; sans heure de début, 9 h
export function debutEvenement(jour: string, debut: string | null | undefined): number {
  return Date.parse(`${jour}T${debut && /^\d{2}:\d{2}$/.test(debut) ? debut : "09:00"}:00${FUSEAU_CHAMBRE}`);
}

export const SUJET_DEFAUT = "Rappel : {événement}";
export const MESSAGE_DEFAUT =
  "Bonjour {prénom},\n\nPetit rappel : « {événement} » a lieu le {date}.\nLieu : {lieu}.\n\nNous avons hâte de vous y retrouver.\n\nÀ bientôt,\nL’équipe CanCham";
export const VARIABLES = ["{prénom}", "{entreprise}", "{événement}", "{date}", "{lieu}"];

// Variables proposées dans l'éditeur du rappel
export const VARIABLES_RAPPEL = [
  { cle: "prénom", libelle: "Prénom" },
  { cle: "entreprise", libelle: "Entreprise" },
  { cle: "événement", libelle: "Événement" },
  { cle: "date", libelle: "Date" },
  { cle: "lieu", libelle: "Lieu" },
];

// Le rappel par défaut, en lettre : bandeau avec l'événement, message, réseaux sociaux et pied de page
export function rappelParDefaut(reseaux: Partial<Record<Reseau, string>> = {}, pied: PiedRegle = {}): DocLettre {
  const d = docVide(reseaux, pied);
  const garder = d.sections.filter((x) => x.type === "logo" || x.type === "reseaux" || x.type === "pied");
  const bandeau = { ...(sectionVide("bandeau") as Extract<Section, { type: "bandeau" }>), titre: "{événement}", sousTitre: "{date} · {lieu}", taille: 30 };
  const message = {
    ...(sectionVide("texte") as Extract<Section, { type: "texte" }>),
    html: "Bonjour {prénom},<br><br>Petit rappel : « {événement} » a lieu le {date}.<br>Lieu : {lieu}.<br><br>Nous avons hâte de vous y retrouver.<br><br>À bientôt,<br>L’équipe de la Chambre",
  };
  return { ...d, sections: [garder[0], bandeau, message, ...garder.slice(1)] };
}

// Remplace {prénom}, {entreprise}… ; une variable inconnue reste telle quelle
export function remplir(modele: string, valeurs: Record<string, string>): string {
  return modele.replace(/\{([^{}]+)\}/g, (tout, cle: string) => valeurs[cle.trim().toLowerCase()] ?? tout);
}

export const prenomDe = (nom: string) => nom.trim().split(/\s+/)[0] || nom;

// Les inscrits d'une même inscription partagent une adresse : un seul courriel par adresse, avec tous leurs codes
export function regrouperParAdresse<T extends { email: string; nom: string; entreprise: string }>(
  inscrits: T[],
): { email: string; participants: T[] }[] {
  const groupes = new Map<string, T[]>();
  for (const p of inscrits) {
    const cle = p.email.trim().toLowerCase();
    if (!cle) continue;
    groupes.set(cle, [...(groupes.get(cle) ?? []), p]);
  }
  return [...groupes].map(([email, participants]) => ({ email, participants }));
}
