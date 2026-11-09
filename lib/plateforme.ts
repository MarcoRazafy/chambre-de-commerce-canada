// Abonnement de la Chambre à la plateforme : un forfait mensuel, plus chaque compte actif de l'équipe.
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

export function facturePlateforme(utilisateurs: number, c: ConfigPlateforme) {
  const equipe = cents(utilisateurs * c.parUtilisateur);
  const sousTotal = cents(c.forfait + equipe);
  const tps = cents((sousTotal * c.tps) / 100);
  const tvq = cents((sousTotal * c.tvq) / 100);
  return { forfait: c.forfait, equipe, sousTotal, tps, tvq, total: cents(sousTotal + tps + tvq) };
}

// Prochaine date de facturation (le jour du mois réglé, aujourd'hui compris), en « AAAA-MM-JJ »
export function prochaineFacturation(aujourdhui: string, jour: number): string {
  const [a, m, j] = aujourdhui.split("-").map(Number);
  const [an, mois] = j <= jour ? [a, m] : m === 12 ? [a + 1, 1] : [a, m + 1];
  return `${an}-${String(mois).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;
}

const DOLLARS = new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" });
export const fmtDollars = (n: number) => DOLLARS.format(n);
export const fmtPourcent = (n: number) => `${String(n).replace(".", ",")} %`;
