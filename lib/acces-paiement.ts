export const OUVERT_AVANT_PAIEMENT = ["/admin/membres", "/admin/entreprise", "/admin/abonnement", "/admin/parametres", "/admin/profil"];

export const ouvertAvantPaiement = (chemin: string) =>
  chemin === "/admin" || OUVERT_AVANT_PAIEMENT.some((p) => chemin === p || chemin.startsWith(`${p}/`));

export const MESSAGE_AVANT_PAIEMENT = "Cette page s’ouvre dès le paiement de votre abonnement.";
