import "server-only";

import { prisma } from "@/lib/db";
import { completerProfil, type ProfilChambre } from "@/lib/profil-chambre-defauts";

// Le profil enregistré, tel quel (pour le formulaire de « Mon entreprise »)
export function getProfilChambreBrut() {
  return prisma.profilChambre.findFirst();
}

// Logo de l'entreprise pour un courriel : jamais bloquant (logo par défaut si le profil est illisible)
export async function logoPourCourriel(): Promise<string | undefined> {
  try {
    return (await getProfilChambre()).logo;
  } catch (e) {
    console.error("[courriel] logo de l'entreprise illisible, logo par défaut utilisé", e);
    return undefined;
  }
}

// Le logo de la Chambre (null : elle n'en a pas réglé, l'espace montre IMPACT 261) et son nom, pour l'en-tête des espaces
export async function marqueDeLaChambre(): Promise<{ logo: string | null; nom: string }> {
  const brut = await getProfilChambreBrut();
  return { logo: brut?.logo?.trim() || null, nom: completerProfil(brut).nom };
}

// Le profil complété par les valeurs par défaut (pour les factures et l'affichage)
export async function getProfilChambre(): Promise<ProfilChambre> {
  return completerProfil(await getProfilChambreBrut());
}
