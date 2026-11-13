// Fonctions qu'une offre de la plateforme peut inclure (réglées par l'Admin GM).
// Membres, contacts, tags, factures et paramètres sont toujours inclus.
export const FONCTIONS = [
  { cle: "maillage", libelle: "Maillage" },
  { cle: "evenements", libelle: "Événements" },
  { cle: "rendezvous", libelle: "Rendez-vous" },
  { cle: "offres", libelle: "Offres & promotions" },
  { cle: "ressources", libelle: "Ressources & services" },
  { cle: "newsletter", libelle: "Newsletter" },
  { cle: "messagerie", libelle: "Messagerie" },
] as const;

export type Fonction = (typeof FONCTIONS)[number]["cle"];
export const estFonction = (v: string): v is Fonction => FONCTIONS.some((f) => f.cle === v);

// Les libellés de fonctions données, dans l'ordre de la liste, séparés par des virgules
export const libellesFonctions = (cles: readonly string[]) => FONCTIONS.filter((f) => cles.includes(f.cle)).map((f) => f.libelle).join(", ");

// Les fonctions ouvertes à une Chambre : celles de son offre ; offre à la carte : celles qu'elle a choisies
// parmi celles de l'offre
export function fonctionsOuvertes(offre: { fonctions: readonly string[]; surMesure: boolean }, choisies: readonly string[]): string[] {
  return offre.surMesure ? offre.fonctions.filter((f) => choisies.includes(f)) : [...offre.fonctions];
}

// Les pages de chaque fonction (espace admin et espace membre) : masquées du menu et fermées si l'offre de la
// Chambre ne l'inclut pas
export const CHEMINS: Record<Fonction, string[]> = {
  maillage: ["/admin/maillage", "/membre/maillage"],
  evenements: ["/admin/evenements", "/admin/agenda", "/membre/evenements", "/membre/agenda"],
  rendezvous: ["/admin/rendez-vous", "/membre/rendez-vous"],
  offres: ["/admin/offres"],
  ressources: ["/admin/ressources", "/admin/offres-cancham", "/membre/ressources", "/membre/offres-cancham"],
  newsletter: ["/admin/newsletter"],
  messagerie: ["/admin/messagerie", "/membre/messagerie"],
};

// La fonction d'une page (« /admin/offres » n'attrape pas « /admin/offres-cancham »), ou null
export function fonctionDuChemin(chemin: string): Fonction | null {
  for (const f of FONCTIONS) {
    if (CHEMINS[f.cle].some((p) => chemin === p || chemin.startsWith(`${p}/`))) return f.cle;
  }
  return null;
}

// Le menu sans les fonctions que l'offre n'inclut pas ; « incluses » null : tout
export function filtrerNav<G extends { items: { href: string }[] }>(nav: G[], incluses: readonly string[] | null | undefined): G[] {
  if (!incluses) return nav;
  return nav
    .map((g) => ({ ...g, items: g.items.filter((i) => { const f = fonctionDuChemin(i.href); return !f || incluses.includes(f); }) }))
    .filter((g) => g.items.length);
}
