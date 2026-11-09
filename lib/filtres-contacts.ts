// Filtres de la page Contacts (une ligne par entreprise, représentée par son contact principal) :
// recherche, situations à cocher (cotisation, accès du contact principal) et tags à cocher.
// Dans une même famille, les cas cochés s'additionnent (« à jour » ou « en retard ») ;
// d'une famille à l'autre, ils se combinent (« en retard » et « invitation en attente »).

export const SITUATIONS = [
  {
    famille: "Cotisation",
    options: [
      { valeur: "a_jour", libelle: "À jour" },
      { valeur: "en_retard", libelle: "En retard" },
      { valeur: "en_attente", libelle: "Paiement attendu" },
      { valeur: "candidature", libelle: "Demande d’adhésion" },
    ],
  },
  {
    famille: "Accès à la plateforme",
    options: [
      { valeur: "actif", libelle: "Accès actif" },
      { valeur: "invite", libelle: "Invitation en attente" },
    ],
  },
] as const;

export type Situation = (typeof SITUATIONS)[number]["options"][number]["valeur"];
const VALEURS = new Set<string>(SITUATIONS.flatMap((g) => g.options.map((o) => o.valeur)));
type Statut = "a_jour" | "en_retard" | "en_attente" | "candidature";
const STATUTS: Statut[] = ["a_jour", "en_retard", "en_attente", "candidature"];

// Case « Sans tag » du filtre des tags
export const SANS_TAG = "__sans_tag__";

// Contacts avec ou sans entreprise (les deux, ou aucun coché : tous)
export const TYPES_CONTACT = [
  { valeur: "avec", libelle: "Avec entreprise" },
  { valeur: "sans", libelle: "Sans entreprise" },
] as const;
export type TypeContact = (typeof TYPES_CONTACT)[number]["valeur"];

export type FiltresContacts = { q: string; situations: Situation[]; tags: string[]; types: TypeContact[] };

type Parametres = Record<string, string | string[] | undefined>;
const liste = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);

export function lireFiltresContacts(p: Parametres): FiltresContacts {
  const q = liste(p.q)[0]?.trim() ?? "";
  const situations = [...new Set(liste(p.situation))].filter((s): s is Situation => VALEURS.has(s));
  // Anciennes adresses : ?acces=actif
  for (const a of liste(p.acces)) if ((a === "actif" || a === "invite") && !situations.includes(a)) situations.push(a);
  const tags = [...new Set(liste(p.tag).map((t) => t.trim().slice(0, 60)).filter(Boolean))];
  const types = [...new Set(liste(p.type))].filter((t): t is TypeContact => t === "avec" || t === "sans");
  return { q, situations, tags, types };
}

// Les mêmes filtres en paramètres d'adresse (pour l'export et le retour après une action)
export function parametresContacts(f: FiltresContacts): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  for (const s of f.situations) p.append("situation", s);
  for (const t of f.tags) p.append("tag", t);
  for (const t of f.types) p.append("type", t);
  return p;
}

// Conditions Prisma (sur les entreprises membres) qui traduisent les filtres
export function conditionsContacts(f: FiltresContacts) {
  const et: Record<string, unknown>[] = [];
  const statuts = STATUTS.filter((s) => f.situations.includes(s));
  if (statuts.length) et.push({ statut: { in: statuts } });

  const actif = f.situations.includes("actif"), invite = f.situations.includes("invite");
  if (actif !== invite) {
    et.push({ users: { some: { role: "membre", contactPrincipal: true, motDePasse: actif ? { not: null } : null } } });
  }

  const noms = f.tags.filter((t) => t !== SANS_TAG);
  const sans = f.tags.includes(SANS_TAG);
  if (noms.length || sans) {
    const ou: Record<string, unknown>[] = [];
    if (noms.length) ou.push({ etiquettes: { hasSome: noms } });
    if (sans) ou.push({ etiquettes: { isEmpty: true } });
    et.push(ou.length === 1 ? ou[0] : { OR: ou });
  }

  if (f.q) {
    const mots = { contains: f.q, mode: "insensitive" as const };
    et.push({
      OR: [
        { nom: mots },
        { secteur: mots },
        { ville: mots },
        { users: { some: { role: "membre", OR: [{ nom: mots }, { email: mots }, { fonction: mots }, { tel: mots }] } } },
      ],
    });
  }
  return et;
}
