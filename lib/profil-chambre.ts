import "server-only";

import { prisma } from "@/lib/db";
import { completerProfil, type ProfilChambre } from "@/lib/profil-chambre-defauts";

// Le profil enregistré, tel quel (pour le formulaire de « Mon entreprise »)
export function getProfilChambreBrut() {
  return prisma.profilChambre.findUnique({ where: { id: "unique" } });
}

// Le profil complété par les valeurs par défaut (pour les factures et l'affichage)
export async function getProfilChambre(): Promise<ProfilChambre> {
  return completerProfil(await getProfilChambreBrut());
}
