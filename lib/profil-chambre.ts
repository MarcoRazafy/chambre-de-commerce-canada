import "server-only";

import { prisma } from "@/lib/db";
import { completerProfil, type ProfilChambre } from "@/lib/profil-chambre-defauts";

// Le profil enregistré, tel quel (pour le formulaire de « Mon entreprise »)
export function getProfilChambreBrut() {
  return prisma.profilChambre.findUnique({ where: { id: "unique" } });
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

// Le profil complété par les valeurs par défaut (pour les factures et l'affichage)
export async function getProfilChambre(): Promise<ProfilChambre> {
  return completerProfil(await getProfilChambreBrut());
}
