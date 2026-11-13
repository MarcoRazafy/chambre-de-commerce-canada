// Abonnement de la Chambre à la plateforme : un forfait mensuel, plus chaque compte actif de l'équipe
// au-delà des comptes offerts (le super admin). Les montants (en $ CAD) sont ceux de l'offre de la Chambre,
// réglée par l'Admin GM (lib/offre-chambre.ts) ; les taxes et le jour de facturation, dans l'environnement.
// Les membres ne sont jamais facturés.

export type ConfigPlateforme = {
  nom: string;
  forfait: number;
  parUtilisateur: number;
  tps: number;
  tvq: number;
  jourFacturation: number;
};

const nombre = (v: string | undefined, defaut: number) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return v !== undefined && v.trim() !== "" && Number.isFinite(n) && n >= 0 ? n : defaut;
};

export function configPlateforme(env: Record<string, string | undefined> = process.env): ConfigPlateforme {
  return {
    nom: env.PLATEFORME_NOM?.trim() || "CanCham Connect — Chambre",
    forfait: nombre(env.PLATEFORME_FORFAIT, 100),
    parUtilisateur: nombre(env.PLATEFORME_PRIX_UTILISATEUR, 15),
    tps: nombre(env.PLATEFORME_TPS, 5),
    tvq: nombre(env.PLATEFORME_TVQ, 9.975),
    jourFacturation: Math.min(28, Math.max(1, Math.round(nombre(env.PLATEFORME_JOUR_FACTURATION, 1)))),
  };
}

const cents = (n: number) => Math.round(n * 100) / 100;

// Comptes offerts par défaut : le super admin
export const UTILISATEURS_OFFERTS = 1;

// Prix d'une offre ; sans forfait ni prix par compte, elle est gratuite (aucune facture)
export type PrixOffre = { forfait: number; parUtilisateur: number; utilisateursOfferts: number };
export const offreGratuite = (o: Pick<PrixOffre, "forfait" | "parUtilisateur">) => o.forfait <= 0 && o.parUtilisateur <= 0;

// Prix mensuels des fonctions d'une offre à la carte (montants positifs seulement)
export function lirePrixFonctions(v: unknown): Record<string, number> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  return Object.fromEntries(Object.entries(v).filter(([, n]) => typeof n === "number" && Number.isFinite(n) && n >= 0));
}

// Forfait mensuel d'une offre ; à la carte : le forfait de base plus le prix des fonctions choisies (parmi celles
// de l'offre)
export type OffreALaCarte = { forfait: number; surMesure: boolean; prixFonctions: unknown; fonctions: readonly string[] };
export function forfaitOffre(o: OffreALaCarte, choisies: readonly string[]): number {
  if (!o.surMesure) return o.forfait;
  const prix = lirePrixFonctions(o.prixFonctions);
  return cents(o.fonctions.filter((f) => choisies.includes(f)).reduce((t, f) => t + (prix[f] ?? 0), o.forfait));
}

// Comptes payants parmi les comptes de l'équipe
export const utilisateursPayants = (utilisateurs: number, offerts = UTILISATEURS_OFFERTS) => Math.max(0, utilisateurs - offerts);

export function facturePlateforme(utilisateurs: number, c: ConfigPlateforme, offerts = UTILISATEURS_OFFERTS) {
  const payants = utilisateursPayants(utilisateurs, offerts);
  const equipe = cents(payants * c.parUtilisateur);
  const sousTotal = cents(c.forfait + equipe);
  const tps = cents((sousTotal * c.tps) / 100);
  const tvq = cents((sousTotal * c.tvq) / 100);
  return { forfait: c.forfait, payants, offerts: utilisateurs - payants, equipe, sousTotal, tps, tvq, total: cents(sousTotal + tps + tvq) };
}

// Comptes payants d'une facture déjà émise, d'après son montant (les anciennes factures comptaient tout le monde)
export const payantsFacture = (f: { forfait: number; sousTotal: number; parUtilisateur: number }) =>
  f.parUtilisateur > 0 ? Math.round((f.sousTotal - f.forfait) / f.parUtilisateur) : 0;

// Prochaine date de facturation (le jour du mois réglé, aujourd'hui compris), en « AAAA-MM-JJ »
export function prochaineFacturation(aujourdhui: string, jour: number): string {
  const [a, m, j] = aujourdhui.split("-").map(Number);
  const [an, mois] = j <= jour ? [a, m] : m === 12 ? [a + 1, 1] : [a, m + 1];
  return `${an}-${String(mois).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;
}

const DOLLARS = new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" });
export const fmtDollars = (n: number) => DOLLARS.format(n);
export const fmtPourcent = (n: number) => `${String(n).replace(".", ",")} %`;

// Factures de l'abonnement : une par mois, numérotée PLT-AAAA-MM, datée du jour de facturation
export const numeroFacturePlateforme = (date: string) => `PLT-${date.slice(0, 7)}`;

// La facture du mois en cours, si son jour est arrivé (« AAAA-MM-JJ »), sinon null
export function dateFactureDuMois(aujourdhui: string, jour: number): string | null {
  const date = `${aujourdhui.slice(0, 8)}${String(jour).padStart(2, "0")}`;
  return aujourdhui >= date ? date : null;
}
