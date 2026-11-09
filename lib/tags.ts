// Tags (repères de l'équipe sur les entreprises) : nettoyage d'une saisie, ajout sans doublon

export const TAGS_MAX = 20;

// Espaces resserrés, 60 caractères au plus, sans vide ni doublon
export function lireTags(valeurs: unknown[]): string[] {
  return [
    ...new Set(
      valeurs
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.trim().replace(/\s+/g, " ").slice(0, 60))
        .filter(Boolean),
    ),
  ].slice(0, TAGS_MAX);
}

// Ajoute des tags à ceux d'une entreprise ; null si rien ne change
export function ajouterTags(existants: string[], nouveaux: string[]): string[] | null {
  const ajout = nouveaux.filter((t) => !existants.includes(t));
  return ajout.length ? [...existants, ...ajout] : null;
}
