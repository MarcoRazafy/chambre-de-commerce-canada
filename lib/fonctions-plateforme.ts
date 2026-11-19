export const FONCTIONS = [
  { cle: "evenements", libelle: "Événements" },
  { cle: "rendezvous", libelle: "Rendez-vous" },
  { cle: "offres", libelle: "Offres & promotions" },
  { cle: "ressources", libelle: "Ressources & services" },
  { cle: "newsletter", libelle: "Newsletter" },
  { cle: "messagerie", libelle: "Messagerie" },
] as const;

export type Fonction = (typeof FONCTIONS)[number]["cle"];
export const estFonction = (v: string): v is Fonction => FONCTIONS.some((f) => f.cle === v);

export const libellesFonctions = (cles: readonly string[]) => FONCTIONS.filter((f) => cles.includes(f.cle)).map((f) => f.libelle).join(", ");

export function fonctionsOuvertes(offre: { fonctions: readonly string[]; surMesure: boolean }, choisies: readonly string[]): string[] {
  return offre.surMesure ? offre.fonctions.filter((f) => choisies.includes(f)) : [...offre.fonctions];
}

export const CHEMINS: Record<Fonction, string[]> = {
  evenements: ["/admin/evenements", "/admin/agenda", "/membre/evenements", "/membre/agenda"],
  rendezvous: ["/admin/rendez-vous", "/membre/rendez-vous"],
  offres: ["/admin/offres"],
  ressources: ["/admin/ressources", "/admin/offres-cancham", "/membre/ressources", "/membre/offres-cancham"],
  newsletter: ["/admin/newsletter"],
  messagerie: ["/admin/messagerie", "/membre/messagerie"],
};

export function fonctionDuChemin(chemin: string): Fonction | null {
  for (const f of FONCTIONS) {
    if (CHEMINS[f.cle].some((p) => chemin === p || chemin.startsWith(`${p}/`))) return f.cle;
  }
  return null;
}

export function filtrerNav<G extends { items: { href: string }[] }>(nav: G[], incluses: readonly string[] | null | undefined): G[] {
  if (!incluses) return nav;
  return nav
    .map((g) => ({ ...g, items: g.items.filter((i) => { const f = fonctionDuChemin(i.href); return !f || incluses.includes(f); }) }))
    .filter((g) => g.items.length);
}
