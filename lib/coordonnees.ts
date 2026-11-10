export const COORDONNEES = {
  telephone: "+261 34 50 280 53",
  email: "info@cancham.mg",
  adresse: "Antananarivo, Madagascar",
  site: "https://cancham.mg/",

  whatsapp: "+261 34 50 280 53" as string | null,

  horaires: null as string | null,

  legal: {
    mentions: "https://www.formation.cancham.mg/mentionslegales",
    confidentialite: "https://www.formation.cancham.mg/contidentialite",
  },

  reseaux: {
    linkedin:
      "https://www.linkedin.com/company/cancham-madagascar-chambre-de-commerce-et-de-coop%C3%A9ration-canada-madagascar/",
    facebook: "https://www.facebook.com/CanChamMG",
  },
} as const;

export function chiffres(numero: string): string {
  return numero.replace(/\D/g, "");
}

export const MOTIFS_CONTACT = [
  "Adhésion et cotisation",
  "Événements",
  "Ressources",
  "Mise en relation",
  "Problème technique",
  "Autre demande",
] as const;
