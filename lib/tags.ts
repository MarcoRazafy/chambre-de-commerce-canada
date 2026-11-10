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

// Tags automatiques : une règle « situation → tag ». Une entreprise porte le tag d'une règle active quand
// elle est dans la situation, et le perd sinon. Les autres tags (posés à la main) ne bougent pas.
export type RegleTagAuto = { statut: string; tag: string; actif: boolean };

export function tagsSelonRegles(etiquettes: string[], statut: string, regles: RegleTagAuto[]): string[] | null {
  const actives = regles.filter((r) => r.actif);
  const geres = new Set(actives.map((r) => r.tag));
  const voulus = new Set(actives.filter((r) => r.statut === statut).map((r) => r.tag));
  const suite = [...etiquettes.filter((t) => !geres.has(t) || voulus.has(t)), ...[...voulus].filter((t) => !etiquettes.includes(t))];
  const change = suite.length !== etiquettes.length || suite.some((t, i) => t !== etiquettes[i]);
  return change ? suite : null;
}

// Les situations d'une entreprise proposées dans les règles
export const SITUATIONS_REGLE: [string, string][] = [
  ["a_jour", "À jour"],
  ["en_attente", "Paiement attendu"],
  ["en_retard", "En retard"],
  ["candidature", "Demande d’adhésion"],
  ["refusee", "Demande refusée"],
];
