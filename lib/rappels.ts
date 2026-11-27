import { docVide, sectionVide, type DocLettre, type Reseau, type Section, type PiedRegle } from "@/lib/lettre-blocs";

import { FUSEAU_CANCHAM, instantDans, saisieDans } from "@/lib/fuseau";

const MINUTE = 60_000;

export const echeance = (avant: number, debut: number) => debut - avant * MINUTE;

export const DATES_MAX = 10;
const RETARD_MAX = 12 * 60 * MINUTE;

export function lireDateEnvoi(saisie: string, fuseau = FUSEAU_CANCHAM): number | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(saisie)) return null;
  const t = instantDans(saisie.slice(0, 10), saisie.slice(11, 16), fuseau);
  return Number.isNaN(t) ? null : t;
}

export function versSaisie(t: number, fuseau = FUSEAU_CANCHAM): string {
  return saisieDans(t, fuseau);
}

export function momentsEnvoi(r: { dates: Date[]; avant: number }, debut: number): number[] {
  if (r.dates.length) return r.dates.map((d) => d.getTime()).sort((a, b) => a - b);
  return r.avant > 0 ? [echeance(r.avant, debut)] : [];
}

export function estDuA(moment: number, debut: number, maintenant: number): boolean {
  return maintenant >= moment && maintenant < moment + RETARD_MAX && maintenant < debut;
}

export const cleEnvoi = (rappelId: string, moment: number) => `${rappelId}@${new Date(moment).toISOString()}`;

export function debutEvenement(jour: string, debut: string | null | undefined, fuseau = FUSEAU_CANCHAM): number {
  return instantDans(jour, debut && /^\d{2}:\d{2}$/.test(debut) ? debut : "09:00", fuseau);
}

export const SUJET_DEFAUT = "Rappel : {événement}";
export const MESSAGE_DEFAUT =
  "Bonjour {prénom},\n\nPetit rappel : « {événement} » a lieu le {date}.\nLieu : {lieu}.\n\nNous avons hâte de vous y retrouver.\n\nÀ bientôt,\nL’équipe de la Chambre";
export const VARIABLES = ["{prénom}", "{entreprise}", "{événement}", "{date}", "{lieu}"];

export const VARIABLES_RAPPEL = [
  { cle: "prénom", libelle: "Prénom" },
  { cle: "entreprise", libelle: "Entreprise" },
  { cle: "événement", libelle: "Événement" },
  { cle: "date", libelle: "Date" },
  { cle: "lieu", libelle: "Lieu" },
];

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

export function remplir(modele: string, valeurs: Record<string, string>): string {
  return modele.replace(/\{([^{}]+)\}/g, (tout, cle: string) => valeurs[cle.trim().toLowerCase()] ?? tout);
}

export const prenomDe = (nom: string) => nom.trim().split(/\s+/)[0] || nom;

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
