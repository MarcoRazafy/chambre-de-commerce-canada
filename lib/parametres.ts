import "server-only";

// Paramètres de la plateforme (page Paramètres), lus dans la fiche de l'entreprise.
// Un champ vide reprend la valeur par défaut, pour que rien ne change tant que rien n'est réglé.
import { COORDONNEES } from "@/lib/coordonnees";
import { RESEAUX, type Reseau } from "@/lib/lettre-blocs";
import { getProfilChambreBrut } from "@/lib/profil-chambre";
import { completerProfil } from "@/lib/profil-chambre-defauts";

export type Mentions = { confidentialite: string; copyright: string; adresse: string; email: string; telephone: string };

const valide = (e: string) => /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(e);

export async function getParametres() {
  return calculer(await getProfilChambreBrut());
}

// Pour un envoi : jamais bloquant (valeurs par défaut si la fiche est illisible)
export async function parametresPourCourriel() {
  try {
    return await getParametres();
  } catch (e) {
    console.error("[parametres] fiche illisible, valeurs par défaut utilisées", e);
    return calculer(null);
  }
}

function calculer(brut: Awaited<ReturnType<typeof getProfilChambreBrut>>) {
  const p = completerProfil(brut);

  // Réseaux : ceux réglés ; aucun réglé, ceux de la configuration
  const regles = Object.fromEntries(RESEAUX.map((r) => [r, brut?.[r]?.trim() ?? ""]).filter(([, v]) => v)) as Partial<Record<Reseau, string>>;
  const reseaux: Partial<Record<Reseau, string>> = Object.keys(regles).length
    ? regles
    : { facebook: COORDONNEES.reseaux.facebook, linkedin: COORDONNEES.reseaux.linkedin };

  const mentions: Mentions = {
    confidentialite: brut?.confidentialite.trim() || COORDONNEES.legal.confidentialite,
    copyright: brut?.copyright.trim() || `© ${new Date().getFullYear()} ${p.nom}. Tous droits réservés.`,
    adresse: p.adresse,
    email: p.email,
    telephone: p.telephone,
  };

  const equipe = brut?.courrielEquipe.trim() ?? "";
  const courrielEquipe = valide(equipe) ? equipe : process.env.COURRIEL_EQUIPE || COORDONNEES.email;

  return { reseaux, mentions, courrielEquipe };
}

// L'adresse qui reçoit les alertes de l'équipe (adhésion, rendez-vous, question d'un visiteur)
export async function courrielEquipe(): Promise<string> {
  try {
    return (await getParametres()).courrielEquipe;
  } catch (e) {
    console.error("[parametres] courriel de l'équipe illisible, valeur du serveur utilisée", e);
    return process.env.COURRIEL_EQUIPE || COORDONNEES.email;
  }
}
