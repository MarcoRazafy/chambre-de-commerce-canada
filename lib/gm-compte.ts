import "server-only";

// Compte de l'Admin GM : lien « mot de passe oublié » (empreinte en base, une heure, un seul usage) et son courriel.
// Hors de toute Chambre : prismaSysteme ; les liens mènent à l'adresse de l'espace GM.
import { createHash, randomBytes } from "node:crypto";
import { envoyerCourriel, gabarit } from "@/lib/courriel";
import { prismaSysteme as db } from "@/lib/db";
import { adresseGM } from "@/lib/visite-gm";

export const DUREE_LIEN_MS = 60 * 60 * 1000;
export const empreinte = (brut: string) => createHash("sha256").update(brut).digest("hex");

// Un nouveau lien pour ce compte ; le précédent ne vaut plus
export async function creerLienReinitialisationGM(id: string): Promise<string> {
  const brut = randomBytes(32).toString("base64url");
  await db.compteGM.update({
    where: { id },
    data: { jetonReinitialisation: empreinte(brut), jetonExpire: new Date(Date.now() + DUREE_LIEN_MS) },
  });
  return `${adresseGM()}/gm/nouveau-mot-de-passe?${new URLSearchParams({ jeton: brut })}`;
}

// Le compte d'un lien encore valable, sinon null
export async function compteGMDuLien(brut: string | undefined) {
  if (!brut || brut.length > 100) return null;
  const c = await db.compteGM.findUnique({
    where: { jetonReinitialisation: empreinte(brut) },
    select: { id: true, nom: true, email: true, jetonExpire: true },
  });
  if (!c?.jetonExpire || c.jetonExpire < new Date()) return null;
  return c;
}

type Courriel = Parameters<typeof envoyerCourriel>[0];

export function courrielReinitialisationGM(a: string, nom: string, lien: string): Courriel {
  return {
    a,
    sujet: "Réinitialiser le mot de passe de votre compte administrateur",
    ...gabarit({
      titre: "Réinitialiser votre mot de passe",
      paragraphes: [
        `Bonjour ${nom.split(/\s+/)[0]},`,
        "Vous avez demandé à changer le mot de passe de votre compte administrateur de L’Alliée Virtuelle. Ce lien est valable une heure et ne sert qu’une fois.",
      ],
      bouton: { libelle: "Choisir un nouveau mot de passe", url: lien },
      apres: ["Si vous n’êtes pas à l’origine de cette demande, ignorez ce message : votre mot de passe actuel reste valable."],
    }),
  };
}
