// Abonnement de la Chambre à la plateforme : un forfait mensuel, plus chaque compte actif de l'équipe
// (le super admin, le plus ancien administrateur, est offert).
// Les montants (en $ CAD) et les taxes se règlent dans l'environnement ; les membres ne sont jamais facturés.

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

// Comptes offerts : le super admin
export const UTILISATEURS_OFFERTS = 1;

// Comptes payants parmi les comptes de l'équipe
export const utilisateursPayants = (utilisateurs: number) => Math.max(0, utilisateurs - UTILISATEURS_OFFERTS);

export function facturePlateforme(utilisateurs: number, c: ConfigPlateforme) {
  const payants = utilisateursPayants(utilisateurs);
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
