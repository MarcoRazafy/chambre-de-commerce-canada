import type { Intervenant } from "@/lib/types";

// Intervenants d'un événement tels que saisis dans le formulaire (une valeur par ligne, dans l'ordre affiché).
// Une ligne sans nom est ignorée ; la photo est la nouvelle si elle a été envoyée, sinon l'actuelle,
// sauf si elle a été retirée. Une « photo actuelle » qui ne vient pas de nos téléversements est écartée.
export const INTERVENANTS_MAX = 20;

export function lireIntervenants(l: {
  noms: string[];
  fonctions: string[];
  entreprises: string[];
  bios: string[];
  actuelles: string[];
  nouvelles: (string | null)[];
  retirees: boolean[];
}): (Intervenant & { ordre: number })[] {
  const propre = (v: string | undefined, max: number) => (v ?? "").replace(/\s+/g, " ").trim().slice(0, max) || null;
  return l.noms
    .map((nom, i) => {
      const actuelle = (l.actuelles[i] ?? "").startsWith("/televersements/") ? l.actuelles[i] : null;
      return {
        nom: propre(nom, 120) ?? "",
        fonction: propre(l.fonctions[i], 120),
        entreprise: propre(l.entreprises[i], 120),
        bio: (l.bios[i] ?? "").trim().slice(0, 600) || null,
        photo: l.nouvelles[i] ?? (l.retirees[i] ? null : actuelle),
      };
    })
    .filter((p) => p.nom)
    .slice(0, INTERVENANTS_MAX)
    .map((p, ordre) => ({ ...p, ordre }));
}
