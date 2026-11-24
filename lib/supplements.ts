import { fmtMoney } from "@/lib/format";

export type Supplement = { id: string; libelle: string; prix: number };

export const SUPPLEMENTS_MAX = 10;
export const PRIX_SUPPLEMENT_MAX = 1_000_000;

export function lireSupplementsSaisis(formData: FormData): { libelle: string; prix: number; ordre: number }[] | string {
  const libelles = formData.getAll("supplementLibelle").map((v) => String(v).replace(/\s+/g, " ").trim().slice(0, 80));
  const prix = formData.getAll("supplementPrix").map((v) => String(v).trim());
  const lignes: { libelle: string; prix: number; ordre: number }[] = [];
  for (let i = 0; i < libelles.length; i++) {
    const libelle = libelles[i];
    const brut = prix[i] ?? "";
    if (!libelle && !brut) continue;
    const montant = Number(brut);
    if (!libelle) return "Donnez un nom à chaque autre paiement (ex. « Dîner de gala »).";
    if (!Number.isInteger(montant) || montant < 1 || montant > PRIX_SUPPLEMENT_MAX) return `Indiquez le prix de « ${libelle} » ($ CAD, nombre entier).`;
    lignes.push({ libelle, prix: montant, ordre: lignes.length });
  }
  if (lignes.length > SUPPLEMENTS_MAX) return `${SUPPLEMENTS_MAX} autres paiements au plus.`;
  return lignes;
}

export function supplementsChoisis(proposes: Supplement[], ids: unknown[]): Supplement[] {
  const voulus = new Set(ids.map(String));
  return proposes.filter((s) => voulus.has(s.id));
}

export const totalSupplements = (l: { prix: number }[]) => l.reduce((somme, s) => somme + s.prix, 0);

export const libelleSupplement = (s: { libelle: string; prix: number }) => `${s.libelle} (${fmtMoney(s.prix)})`;
