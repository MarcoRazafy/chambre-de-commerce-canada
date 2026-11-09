import { docVide, sectionVide, type DocLettre, type Reseau, type Section } from "@/lib/lettre-blocs";
// Rappels automatiques aux inscrits d'un événement : quand chacun part, le texte du courriel.
// Sans dépendance au serveur.

import { FUSEAU_CHAMBRE } from "@/lib/rendezvous";

export type TypeRappel = "j7" | "j1" | "h2";

const HEURE = 3_600_000;

// « avant » : combien de temps avant le début ; « tolerance » : jusqu'à quand un rappel en retard
// (serveur arrêté, inscription tardive) part encore. Au-delà, il est sauté : un « J-7 » reçu la veille n'a plus de sens.
export const RAPPELS: { cle: TypeRappel; libelle: string; champ: "rappelJ7" | "rappelJ1" | "rappelH2"; avant: number; tolerance: number }[] = [
  { cle: "j7", libelle: "7 jours avant", champ: "rappelJ7", avant: 7 * 24 * HEURE, tolerance: 24 * HEURE },
  { cle: "j1", libelle: "La veille", champ: "rappelJ1", avant: 24 * HEURE, tolerance: 12 * HEURE },
  { cle: "h2", libelle: "2 heures avant", champ: "rappelH2", avant: 2 * HEURE, tolerance: 1.5 * HEURE },
];

// Début de l'événement, heure de Madagascar ; sans heure de début, 9 h
export function debutEvenement(jour: string, debut: string | null | undefined): number {
  return Date.parse(`${jour}T${debut && /^\d{2}:\d{2}$/.test(debut) ? debut : "09:00"}:00${FUSEAU_CHAMBRE}`);
}

export function echeance(type: TypeRappel, debut: number): number {
  return debut - RAPPELS.find((r) => r.cle === type)!.avant;
}

// Un rappel part une fois son heure venue, tant qu'il n'est pas trop en retard et que l'événement n'a pas commencé
export function estDu(type: TypeRappel, debut: number, maintenant: number): boolean {
  const r = RAPPELS.find((x) => x.cle === type)!;
  const heure = debut - r.avant;
  return maintenant >= heure && maintenant < heure + r.tolerance && maintenant < debut;
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
