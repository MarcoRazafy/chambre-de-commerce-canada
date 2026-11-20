export type ModeReglement =
  | "mvola"
  | "orange_money"
  | "airtel_money"
  | "virement"
  | "depot"
  | "especes"
  | "carte"
  | "paypal"
  | "plateforme";

export interface DescriptionMode {
  titre: string;
  detail: string;
  enLigne: boolean;
}

export const MODES: Record<ModeReglement, DescriptionMode> = {
  carte: {
    titre: "Carte bancaire",
    detail: "Visa, Mastercard. Paiement immédiat, sur la page du prestataire.",
    enLigne: true,
  },
  paypal: {
    titre: "PayPal",
    detail: "Depuis votre compte PayPal, vers celui de la chambre.",
    enLigne: false,
  },
  mvola: {
    titre: "MVola",
    detail: "Portefeuille Telma. Validation sur votre téléphone.",
    enLigne: true,
  },
  orange_money: {
    titre: "Orange Money",
    detail: "Portefeuille Orange. Validation sur votre téléphone.",
    enLigne: true,
  },
  airtel_money: {
    titre: "Airtel Money",
    detail: "Portefeuille Airtel. Validation sur votre téléphone.",
    enLigne: true,
  },
  virement: {
    titre: "Virement bancaire",
    detail: "Depuis votre banque, vers le compte de la chambre.",
    enLigne: false,
  },
  depot: {
    titre: "Dépôt bancaire",
    detail: "Espèces déposées au guichet, avec un bordereau pré-rempli.",
    enLigne: false,
  },
  especes: {
    titre: "Espèces",
    detail: "Remise en main propre à l’équipe, contre reçu.",
    enLigne: false,
  },
  plateforme: {
    titre: "Plateformes de paiement",
    detail: "Wise et autres services de transfert.",
    enLigne: false,
  },
};

export const ORDRE_MODES = Object.keys(MODES) as ModeReglement[];

export const MODES_EN_LIGNE: ModeReglement[] = [
  "carte",
  "mvola",
  "orange_money",
  "airtel_money",
];

export function estModeReglement(v: string): v is ModeReglement {
  return (ORDRE_MODES as string[]).includes(v);
}

export function estPortefeuille(mode: ModeReglement): boolean {
  return mode === "mvola" || mode === "orange_money" || mode === "airtel_money";
}

export type Coordonnees = {
  titulaire: string;
  banque: string;
  agence: string;
  rib: string;
  iban: string;
  bic: string;
  mvola: string;
  orangeMoney: string;
  airtelMoney: string;
  adresseBureau: string;
  horaires: string;
  plateformes: string;
  paypal: string;
};

export const COORDONNEES_VIDES: Coordonnees = {
  titulaire: "",
  banque: "",
  agence: "",
  rib: "",
  iban: "",
  bic: "",
  mvola: "",
  orangeMoney: "",
  airtelMoney: "",
  adresseBureau: "",
  horaires: "",
  plateformes: "",
  paypal: "",
};

export function numeroPortefeuille(
  mode: ModeReglement,
  c: Coordonnees,
): string {
  switch (mode) {
    case "mvola":
      return c.mvola;
    case "orange_money":
      return c.orangeMoney;
    case "airtel_money":
      return c.airtelMoney;
    default:
      return "";
  }
}

export function modeDisponible(
  mode: ModeReglement,
  c: Coordonnees,
  enLigneActif: boolean,
): boolean {
  switch (mode) {
    case "carte":
      return enLigneActif;
    case "mvola":
    case "orange_money":
    case "airtel_money":
      return true;
    case "virement":
      return Boolean(c.rib || c.iban);
    case "depot":
      return Boolean(c.rib && c.banque);
    case "especes":
      return Boolean(c.adresseBureau);
    case "plateforme":
      return Boolean(c.plateformes.trim());
    case "paypal":
      return Boolean(c.paypal.trim());
  }
}
