import "server-only";
import { randomBytes } from "node:crypto";
import { CHAMBRE_PRINCIPALE, chambreCourante } from "@/lib/chambre-courante";
import { prisma } from "@/lib/db";
import { compteStripeActif } from "@/lib/encaissement-stripe";
import {
  mobileMoneyEnLigne,
  MONTANT_MINIMUM_EN_LIGNE,
  vanillaPayActif,
} from "@/lib/vanillapay";
import {
  COORDONNEES_VIDES,
  MODES_EN_LIGNE,
  type Coordonnees,
  type ModeReglement,
} from "@/lib/modes-reglement";

export * from "@/lib/modes-reglement";
export { estPortefeuilleConnu } from "@/lib/portefeuilles";

export async function getCoordonneesPaiement(): Promise<Coordonnees> {
  const c = await prisma.coordonneesPaiement.findFirst();
  if (!c) return COORDONNEES_VIDES;
  return {
    titulaire: c.titulaire,
    banque: c.banque,
    agence: c.agence,
    rib: c.rib,
    iban: c.iban,
    bic: c.bic,
    mvola: c.mvola,
    orangeMoney: c.orangeMoney,
    airtelMoney: c.airtelMoney,
    adresseBureau: c.adresseBureau,
    horaires: c.horaires,
    plateformes: c.plateformes,
  };
}

// Moyens en ligne proposés aux membres : la carte par le compte Stripe de la Chambre s'il est connecté ;
// VanillaPay (carte, mobile money), dont le compte marchand est celui du serveur, pour la Chambre n° 1 seulement
export async function modesProposes(): Promise<ModeReglement[]> {
  const [stripe, chambreId] = await Promise.all([compteStripeActif(), chambreCourante()]);
  const vanillaPay = chambreId === CHAMBRE_PRINCIPALE;
  return MODES_EN_LIGNE.filter((m) =>
    m === "carte" ? Boolean(stripe) || (vanillaPay && vanillaPayActif()) : vanillaPay && mobileMoneyEnLigne(),
  );
}

// Le minimum en ligne est celui de VanillaPay : la carte par Stripe reste proposée en dessous
export async function modesPublics(montant: number): Promise<ModeReglement[]> {
  const modes = await modesProposes();
  if (montant >= MONTANT_MINIMUM_EN_LIGNE) return modes;
  return (await compteStripeActif()) ? modes.filter((m) => m === "carte") : [];
}

export async function modesBientot(): Promise<ModeReglement[]> {
  return (await modesProposes()).includes("carte") ? [] : ["carte"];
}

export function referenceReglement(annee = new Date().getFullYear()): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffixe = "";
  for (const n of randomBytes(6)) suffixe += alphabet[n % alphabet.length];
  return `CC-${annee}-${suffixe}`;
}

export function enLettres(n: number): string {
  const unites = [
    "zéro",
    "un",
    "deux",
    "trois",
    "quatre",
    "cinq",
    "six",
    "sept",
    "huit",
    "neuf",
    "dix",
    "onze",
    "douze",
    "treize",
    "quatorze",
    "quinze",
    "seize",
  ];
  const dizaines = [
    "",
    "",
    "vingt",
    "trente",
    "quarante",
    "cinquante",
    "soixante",
    "soixante",
    "quatre-vingt",
    "quatre-vingt",
  ];

  const petit = (x: number): string => {
    if (x < 17) return unites[x];
    if (x < 20) return `dix-${unites[x - 10]}`;
    if (x < 100) {
      const d = Math.floor(x / 10);
      const u = x % 10;
      const base = d === 7 || d === 9 ? dizaines[d] : dizaines[d];
      const reste = d === 7 || d === 9 ? petit(10 + u) : u ? unites[u] : "";
      if (!reste) return d === 8 ? `${base}s` : base;
      return `${base}${u === 1 && d !== 8 && d !== 7 && d !== 9 ? "-et-" : "-"}${reste}`;
    }
    if (x < 1000) {
      const c = Math.floor(x / 100);
      const reste = x % 100;
      const cent = c === 1 ? "cent" : `${unites[c]}-cent${reste ? "" : "s"}`;
      return reste ? `${cent}-${petit(reste)}` : cent;
    }
    return String(x);
  };

  if (n === 0) return "zéro";
  const millions = Math.floor(n / 1_000_000);
  const milliers = Math.floor((n % 1_000_000) / 1000);
  const reste = n % 1000;

  const morceaux: string[] = [];
  if (millions) {
    morceaux.push(
      millions === 1 ? "un-million" : `${petit(millions)}-millions`,
    );
  }
  if (milliers) {
    morceaux.push(milliers === 1 ? "mille" : `${petit(milliers)}-mille`);
  }
  if (reste) morceaux.push(petit(reste));
  return morceaux.join("-");
}
