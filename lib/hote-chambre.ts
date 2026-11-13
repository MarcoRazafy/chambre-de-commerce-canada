// L'adresse du site dit de quelle Chambre il s'agit :
//  - « slug ».DOMAINE_PLATEFORME (ex. cancham.lalliee-virtuelle.com) ; en développement, « slug ».localhost ;
//  - sinon l'adresse elle-même, qui peut être le domaine propre d'une Chambre (ex. cancham.mg).
// Fonction pure (testée) : la recherche en base se fait dans lib/chambre-courante.ts.

// Sous-domaines de la plateforme qui ne sont pas des Chambres (site public, Admin GM, services)
export const SOUS_DOMAINES_RESERVES = new Set([
  "www", "manage", "gm", "app", "api", "admin", "mail", "smtp", "imap", "webmail", "static", "cdn", "assets", "docs", "aide", "support", "status",
]);

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

// Le sous-domaine de l'espace administrateur de la plateforme (manage.DOMAINE_PLATEFORME, manage.localhost en local)
export const SOUS_DOMAINE_ADMIN = "manage";

export type Hote = { type: "sous-domaine"; slug: string } | { type: "gm" } | { type: "plateforme" } | { type: "autre"; hote: string };

// « Cancham.Lalliee-Virtuelle.com:443 » → { sous-domaine « cancham » } ; « manage.lalliee-virtuelle.com » → { gm } (l'espace administrateur) ;
// « lalliee-virtuelle.com » ou « www.… » → { plateforme } (le site public, en premier sur le domaine) ;
// « cancham.mg » → { autre « cancham.mg » }. En développement : localhost et www.localhost → le site public.
export function lireHote(brut: string | null | undefined, plateforme: string | null, dev: boolean): Hote {
  const hote = (brut ?? "").split(",")[0].trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
  const domaine = plateforme?.trim().toLowerCase() || null;
  // Le site public de la plateforme : son domaine, avec ou sans www (localhost, avec ou sans www, en développement)
  if (domaine && (hote === domaine || hote === `www.${domaine}`)) return { type: "plateforme" };
  if (dev && (hote === "localhost" || hote === "www.localhost")) return { type: "plateforme" };
  for (const base of [domaine, dev ? "localhost" : null]) {
    if (!base || !hote.endsWith(`.${base}`)) continue;
    const slug = hote.slice(0, -(base.length + 1));
    // L'espace administrateur de la plateforme : manage.DOMAINE_PLATEFORME (manage.localhost en développement)
    if (slug === SOUS_DOMAINE_ADMIN) return { type: "gm" };
    if (SLUG.test(slug) && !SOUS_DOMAINES_RESERVES.has(slug)) return { type: "sous-domaine", slug };
  }
  return { type: "autre", hote };
}

// Un sous-domaine possible pour une Chambre (choix de l'adresse à la création)
export const slugValide = (slug: string) => SLUG.test(slug) && !SOUS_DOMAINES_RESERVES.has(slug);

const typeHote = (brut: string | null | undefined) =>
  lireHote(brut, process.env.DOMAINE_PLATEFORME ?? null, process.env.NODE_ENV !== "production").type;

// L'adresse est-elle celle de l'espace Admin GM ? du site public de la plateforme ?
export const estHoteGM = (brut: string | null | undefined) => typeHote(brut) === "gm";
export const estHotePlateforme = (brut: string | null | undefined) => typeHote(brut) === "plateforme";
