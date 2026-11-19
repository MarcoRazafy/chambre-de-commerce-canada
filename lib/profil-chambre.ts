import "server-only";

import { prisma } from "@/lib/db";
import { completerProfil, type ProfilChambre } from "@/lib/profil-chambre-defauts";

export function getProfilChambreBrut() {
  return prisma.profilChambre.findFirst();
}

export async function logoPourCourriel(): Promise<string | undefined> {
  try {
    return (await getProfilChambre()).logo;
  } catch (e) {
    console.error("[courriel] logo de l'entreprise illisible, logo par défaut utilisé", e);
    return undefined;
  }
}

export async function marqueDeLaChambre(): Promise<{ logo: string | null; nom: string }> {
  const brut = await getProfilChambreBrut();
  return { logo: brut?.logo?.trim() || null, nom: completerProfil(brut).nom };
}

export async function getProfilChambre(): Promise<ProfilChambre> {
  return completerProfil(await getProfilChambreBrut());
}
