export const TAGS_MAX = 20;

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

export function ajouterTags(existants: string[], nouveaux: string[]): string[] | null {
  const ajout = nouveaux.filter((t) => !existants.includes(t));
  return ajout.length ? [...existants, ...ajout] : null;
}

export type RegleTagAuto = { statut: string; tag: string; actif: boolean };

export function tagsSelonRegles(etiquettes: string[], statut: string, regles: RegleTagAuto[]): string[] | null {
  const actives = regles.filter((r) => r.actif);
  const geres = new Set(actives.map((r) => r.tag));
  const voulus = new Set(actives.filter((r) => r.statut === statut).map((r) => r.tag));
  const suite = [...etiquettes.filter((t) => !geres.has(t) || voulus.has(t)), ...[...voulus].filter((t) => !etiquettes.includes(t))];
  const change = suite.length !== etiquettes.length || suite.some((t, i) => t !== etiquettes[i]);
  return change ? suite : null;
}

export const SITUATIONS_REGLE: [string, string][] = [
  ["a_jour", "À jour"],
  ["en_attente", "Paiement attendu"],
  ["en_retard", "En retard"],
  ["candidature", "Demande d’adhésion"],
  ["refusee", "Demande refusée"],
];
