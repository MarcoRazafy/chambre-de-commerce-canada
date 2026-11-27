import { DELAI_REGLEMENT_JOURS, RETARD_BLOCAGE_JOURS } from "@/lib/membership";

export type Delais = { reglement: number; blocage: number };
export const DELAIS_PAR_DEFAUT: Delais = { reglement: DELAI_REGLEMENT_JOURS, blocage: RETARD_BLOCAGE_JOURS };
export const DELAI_MAX = 365;

export const delaiValide = (n: unknown, defaut: number) =>
  typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= DELAI_MAX ? n : defaut;
