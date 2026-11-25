import { VARIABLES } from "@/lib/lettre-blocs";

export type Declencheur = "facture" | "adhesion";

export const DECLENCHEURS: Record<Declencheur, { titre: string; delai: string }> = {
  facture: { titre: "Facture impayée", delai: "jours après la date de la facture" },
  adhesion: { titre: "Fin d’adhésion", delai: "jours avant la fin de l’adhésion" },
};

export const estDeclencheur = (v: unknown): v is Declencheur => v === "facture" || v === "adhesion";

export const JOURS_MAX = 365;

export const VARIABLES_RAPPEL = [
  ...VARIABLES,
  { cle: "chambre", libelle: "Nom de la Chambre" },
  { cle: "facture", libelle: "N° de facture" },
  { cle: "objet", libelle: "Objet de la facture" },
  { cle: "montant", libelle: "Montant" },
  { cle: "echeance", libelle: "Fin de l’adhésion" },
  { cle: "jours", libelle: "Nombre de jours" },
  { cle: "lien", libelle: "Lien pour régler" },
] as const;

export function libelleRappel(r: { declencheur: string; jours: number }): string {
  const j = `${r.jours} jour${r.jours > 1 ? "s" : ""}`;
  return r.declencheur === "adhesion" ? `${j} avant la fin de l’adhésion` : `${j} après la date de la facture`;
}

export function choisirRappel<R extends { jours: number }>(
  rappels: R[],
  ecart: number,
  declencheur: Declencheur,
  dejaFait: (r: R) => boolean,
): { rappel: R; atteints: R[] } | null {
  if (ecart < 0) return null;
  const atteints = rappels.filter((r) => (declencheur === "facture" ? r.jours <= ecart : ecart <= r.jours));
  const restants = atteints.filter((r) => !dejaFait(r));
  if (!restants.length) return null;
  const rappel = restants.reduce((a, b) => ((declencheur === "facture" ? b.jours > a.jours : b.jours < a.jours) ? b : a));
  return { rappel, atteints };
}

export function lettreDeRelance<R extends { jours: number }>(rappels: R[], age: number): R | null {
  if (!rappels.length) return null;
  const atteints = rappels.filter((r) => r.jours <= age);
  const liste = atteints.length ? atteints : rappels;
  return liste.reduce((a, b) => (atteints.length ? b.jours > a.jours : b.jours < a.jours) ? b : a);
}
