import path from "node:path";

export const RACINE_STOCKAGE = path.resolve(
  process.env.STOCKAGE_RACINE || path.join(process.cwd(), "stockage"),
);

export function dossierStockage(...parties: string[]): string {
  return path.join(RACINE_STOCKAGE, ...parties);
}
