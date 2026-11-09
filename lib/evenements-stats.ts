// Événements du back-office : sélection (période + recherche) et statistiques d'inscription et de présence.
// Sans dépendance au serveur : la page et l'export CSV s'en servent tous les deux.

import { isPast } from "@/lib/format";

export type Periode = "a_venir" | "passes";

export const lirePeriode = (v?: string): Periode => (v === "passes" ? "passes" : "a_venir");

// Recherche insensible aux accents et à la casse, sur le titre, le lieu et le format
const sansAccents = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
export function correspond(e: { titre: string; lieu: string; format: string }, q: string): boolean {
  const mots = sansAccents(q).split(/\s+/).filter(Boolean);
  const texte = sansAccents(`${e.titre} ${e.lieu} ${e.format}`);
  return mots.every((m) => texte.includes(m));
}

// À venir : du plus proche au plus lointain ; passés : du plus récent au plus ancien
export function selection<T extends { date: string; titre: string; lieu: string; format: string }>(
  events: T[],
  periode: Periode,
  q = "",
): T[] {
  const dans = events.filter((e) => (periode === "passes" ? isPast(e.date) : !isPast(e.date)) && correspond(e, q));
  return periode === "passes" ? dans.sort((a, b) => b.date.localeCompare(a.date)) : dans;
}

export type ComptesPresence = { a_valider: number; confirme: number; present: number; absent: number };
export const AUCUN: ComptesPresence = { a_valider: 0, confirme: 0, present: 0, absent: 0 };

const pourcent = (n: number, sur: number) => (sur > 0 ? Math.round((n / sur) * 1000) / 10 : null);

export function statistiques(cap: number, c: ComptesPresence) {
  const inscrits = c.a_valider + c.confirme + c.present + c.absent;
  const pointes = c.present + c.absent;
  return {
    inscrits,
    remplissage: pourcent(inscrits, cap),
    presents: c.present,
    absents: c.absent,
    aValider: c.a_valider,
    nonPointes: c.confirme,
    // Taux de présence : parmi les inscrits dont la venue est connue (présents ou absents)
    tauxPresence: pourcent(c.present, pointes),
  };
}

export const fmtPourcentCsv = (v: number | null) => (v === null ? "" : `${String(v).replace(".", ",")} %`);
