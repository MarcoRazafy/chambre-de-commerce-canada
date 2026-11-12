// L'adresse du site dit de quelle Chambre il s'agit :
//  - « slug ».DOMAINE_PLATEFORME (ex. cancham.lalliee-virtuelle.com) ; en développement, « slug ».localhost ;
//  - sinon l'adresse elle-même, qui peut être le domaine propre d'une Chambre (ex. cancham.mg).
// Fonction pure (testée) : la recherche en base se fait dans lib/chambre-courante.ts.

// Sous-domaines de la plateforme qui ne sont pas des Chambres (site public, Admin GM, services)
export const SOUS_DOMAINES_RESERVES = new Set([
  "www", "gm", "app", "api", "admin", "mail", "smtp", "imap", "webmail", "static", "cdn", "assets", "docs", "aide", "support", "status",
]);

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export type Hote = { type: "sous-domaine"; slug: string } | { type: "gm" } | { type: "autre"; hote: string };

// « Cancham.Lalliee-Virtuelle.com:443 » → { sous-domaine « cancham » } ; « gm.lalliee-virtuelle.com » → { gm } ;
// « cancham.mg » → { autre « cancham.mg » }
export function lireHote(brut: string | null | undefined, plateforme: string | null, dev: boolean): Hote {
  const hote = (brut ?? "").split(",")[0].trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
  for (const base of [plateforme?.trim().toLowerCase() || null, dev ? "localhost" : null]) {
    if (!base || !hote.endsWith(`.${base}`)) continue;
    const slug = hote.slice(0, -(base.length + 1));
    // L'espace de l'Admin GM : gm.DOMAINE_PLATEFORME (gm.localhost en développement)
    if (slug === "gm") return { type: "gm" };
    if (SLUG.test(slug) && !SOUS_DOMAINES_RESERVES.has(slug)) return { type: "sous-domaine", slug };
  }
  return { type: "autre", hote };
}

// Un sous-domaine possible pour une Chambre (choix de l'adresse à la création)
export const slugValide = (slug: string) => SLUG.test(slug) && !SOUS_DOMAINES_RESERVES.has(slug);

// L'adresse est-elle celle de l'espace Admin GM ?
export const estHoteGM = (brut: string | null | undefined) =>
  lireHote(brut, process.env.DOMAINE_PLATEFORME ?? null, process.env.NODE_ENV !== "production").type === "gm";
