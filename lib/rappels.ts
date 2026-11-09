import { docVide, sectionVide, type DocLettre, type Reseau, type Section } from "@/lib/lettre-blocs";
// Rappels automatiques aux inscrits d'un événement : quand chacun part, le texte du courriel.
// Sans dépendance au serveur.

import { FUSEAU_CHAMBRE } from "@/lib/rendezvous";

const MINUTE = 60_000;

// Délai d'un rappel, en minutes avant le début de l'événement (de 15 minutes à 90 jours)
export const UNITES_DELAI = [
  { cle: "minutes", libelle: "minutes", minutes: 1 },
  { cle: "heures", libelle: "heures", minutes: 60 },
  { cle: "jours", libelle: "jours", minutes: 1440 },
] as const;
export type UniteDelai = (typeof UNITES_DELAI)[number]["cle"];
export const DELAI_MIN = 15;
export const DELAI_MAX = 90 * 1440;

export function lireDelai(nombre: unknown, unite: unknown): number | null {
  const u = UNITES_DELAI.find((x) => x.cle === unite);
  const n = Number(nombre);
  if (!u || !Number.isFinite(n) || n <= 0) return null;
  const minutes = Math.round(n * u.minutes);
  return minutes >= DELAI_MIN && minutes <= DELAI_MAX ? minutes : null;
}

// Le délai dans l'unité la plus lisible (2 jours, 3 heures, 45 minutes)
export function decomposerDelai(minutes: number): { nombre: number; unite: UniteDelai } {
  if (minutes % 1440 === 0) return { nombre: minutes / 1440, unite: "jours" };
  if (minutes % 60 === 0) return { nombre: minutes / 60, unite: "heures" };
  return { nombre: minutes, unite: "minutes" };
}

export function libelleDelai(minutes: number): string {
  if (minutes === 1440) return "La veille";
  const { nombre, unite } = decomposerDelai(minutes);
  const mot = unite === "jours" ? "jour" : unite === "heures" ? "heure" : "minute";
  return `${nombre} ${mot}${nombre > 1 ? "s" : ""} avant`;
}

export const echeance = (avant: number, debut: number) => debut - avant * MINUTE;

// Un rappel part une fois son heure venue, tant qu'il n'est pas trop en retard (la moitié du délai, entre
// 1 heure et 1 jour) et que l'événement n'a pas commencé : un « 7 jours avant » reçu la veille n'aurait plus de sens
export function estDu(avant: number, debut: number, maintenant: number): boolean {
  const heure = echeance(avant, debut);
  const tolerance = Math.min(1440, Math.max(60, avant / 2)) * MINUTE;
  return maintenant >= heure && maintenant < heure + tolerance && maintenant < debut;
}

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
export function rappelParDefaut(reseaux: Partial<Record<Reseau, string>> = {}): DocLettre {
  const d = docVide(reseaux);
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
