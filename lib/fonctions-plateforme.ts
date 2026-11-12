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
