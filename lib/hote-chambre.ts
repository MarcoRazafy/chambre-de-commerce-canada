export const SOUS_DOMAINES_RESERVES = new Set([
  "www", "manager", "manage", "gm", "dev", "app", "client", "api", "admin", "mail", "smtp", "imap", "webmail", "static", "cdn", "assets", "docs", "aide", "support", "status",
]);

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export const SOUS_DOMAINE_ADMIN = "manager";
export const SOUS_DOMAINE_EQUIPE = "dev";
export const SOUS_DOMAINE_MEMBRES = "client";
export type EspacePartage = "equipe" | "client";
export const SOUS_DOMAINE_ESPACE: Record<EspacePartage, string> = { equipe: SOUS_DOMAINE_EQUIPE, client: SOUS_DOMAINE_MEMBRES };
export const espaceDuRole = (role: string): EspacePartage => (role === "admin" ? "equipe" : "client");

export type Hote =
  | { type: "sous-domaine"; slug: string }
  | { type: "gm" }
  | { type: "plateforme" }
  | { type: "partage"; espace: EspacePartage }
  | { type: "autre"; hote: string };

export function lireHote(brut: string | null | undefined, plateforme: string | null, dev: boolean): Hote {
  const hote = (brut ?? "").split(",")[0].trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
  const domaine = plateforme?.trim().toLowerCase() || null;
  if (domaine && (hote === domaine || hote === `www.${domaine}`)) return { type: "plateforme" };
  if (dev && (hote === "localhost" || hote === "www.localhost")) return { type: "plateforme" };
  for (const base of [domaine, dev ? "localhost" : null]) {
    if (!base || !hote.endsWith(`.${base}`)) continue;
    const slug = hote.slice(0, -(base.length + 1));
    if (slug === SOUS_DOMAINE_ADMIN) return { type: "gm" };
    if (slug === SOUS_DOMAINE_EQUIPE) return { type: "partage", espace: "equipe" };
    if (slug === SOUS_DOMAINE_MEMBRES) return { type: "partage", espace: "client" };
    if (SLUG.test(slug) && !SOUS_DOMAINES_RESERVES.has(slug)) return { type: "sous-domaine", slug };
  }
  return { type: "autre", hote };
}

export const slugValide = (slug: string) => SLUG.test(slug) && !SOUS_DOMAINES_RESERVES.has(slug);

const typeHote = (brut: string | null | undefined) =>
  lireHote(brut, process.env.DOMAINE_PLATEFORME ?? null, process.env.NODE_ENV !== "production").type;

export const estHoteGM = (brut: string | null | undefined) => typeHote(brut) === "gm";
export const estHotePlateforme = (brut: string | null | undefined) => typeHote(brut) === "plateforme";
