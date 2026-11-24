export const RELAIS_RETOUR = "/api/paiements/retour";

export const REPLI_RETOUR = "/membre/cotisations";

const PAGES_DE_RETOUR = [
  /^\/membre\/cotisations\/retour\?/,
  /^\/evenements\/[A-Za-z0-9_-]+\/billet\?/,
  /^\/c\/[a-z0-9-]+\/evenements\/[A-Za-z0-9_-]+\/billet\?/,
];

const HOTES_LOCAUX: Record<string, string> = {
  "1": "localhost",
  "2": "127.0.0.1",
};

export function marqueLocale(nomHote: string): string | null {
  return (
    Object.keys(HOTES_LOCAUX).find((m) => HOTES_LOCAUX[m] === nomHote) ?? null
  );
}

export function hoteLocal(marque: string | null | undefined): string | null {
  return (marque && HOTES_LOCAUX[marque]) || null;
}

export function versRelais(chemin: string, local?: string): string {
  return `${RELAIS_RETOUR}?${new URLSearchParams({
    vers: chemin,
    ...(local ? { local } : {}),
  })}`;
}

export function destinationDuRetour(vers: string | null | undefined): string {
  const chemin = String(vers ?? "");
  if (!chemin.startsWith("/") || chemin.startsWith("//")) return REPLI_RETOUR;
  if (!/^[\x21-\x7e]+$/.test(chemin) || chemin.includes("\\")) {
    return REPLI_RETOUR;
  }
  return PAGES_DE_RETOUR.some((page) => page.test(chemin))
    ? chemin
    : REPLI_RETOUR;
}
