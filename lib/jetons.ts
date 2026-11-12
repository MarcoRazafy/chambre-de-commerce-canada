import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { prisma, prismaSysteme } from "@/lib/db";

export type UsageJeton = "reinitialisation" | "invitation";

const DUREE: Record<UsageJeton, number> = {
  reinitialisation: 60 * 60 * 1000,
  invitation: 7 * 24 * 60 * 60 * 1000,
};

const empreinte = (brut: string) =>
  createHash("sha256").update(brut).digest("hex");

export async function creerJeton(
  userId: string,
  usage: UsageJeton,
): Promise<string> {
  await prisma.jetonCompte.deleteMany({
    where: { userId, usage, utiliseLe: null },
  });
  const brut = randomBytes(32).toString("base64url");
  await prisma.jetonCompte.create({
    data: {
      userId,
      usage,
      empreinte: empreinte(brut),
      expire: new Date(Date.now() + DUREE[usage]),
    },
  });
  return brut;
}

export async function jetonValide(brut: string | undefined) {
  if (!brut || brut.length > 100) return null;
  // Lien reçu par courriel, ouvert sans session : le jeton est cherché dans toutes les Chambres
  const jeton = await prismaSysteme.jetonCompte.findUnique({
    where: { empreinte: empreinte(brut) },
    include: {
      user: {
        select: {
          id: true,
          nom: true,
          email: true,
          role: true,
          memberId: true,
          chambreId: true,
          member: { select: { nom: true, accueilEnCours: true } },
        },
      },
    },
  });
  if (!jeton || jeton.utiliseLe || jeton.expire < new Date()) return null;
  if (jeton.user.role === "visiteur") return null;
  return jeton;
}
