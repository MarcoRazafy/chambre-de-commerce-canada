export const PREFIXE_CANCHAM = "CC";

const sansAccents = (v: string) => v.normalize("NFD").replace(/\p{M}/gu, "");

export function nettoyerPrefixe(v: string): string {
  return sansAccents(v).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
}

export function prefixeParDefaut(nom: string, principale: boolean): string {
  if (principale) return PREFIXE_CANCHAM;
  const mots = sansAccents(nom).split(/[^A-Za-z0-9]+/).filter(Boolean);
  const initiales = mots.map((m) => m[0]).join("").toUpperCase().slice(0, 4);
  if (initiales.length >= 2) return initiales;
  const debut = nettoyerPrefixe(nom).slice(0, 3);
  return debut.length >= 2 ? debut : "FA";
}

export const MOTIF_CODE = "[A-Z0-9]{2,5}-[A-Z0-9]+-[A-Z0-9]{4,8}";
