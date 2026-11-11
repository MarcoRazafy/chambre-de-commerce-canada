"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { fermerSession, verifier } from "@/lib/auth";
import { redirectWithErreur, redirectWithFlash } from "@/lib/flash";
import { minutes, oublier, tentative } from "@/lib/limite";
import { getCurrentUser } from "@/lib/session";

const ESSAIS = 5;

export async function supprimerMonCompte(formData: FormData) {
  const retour = "/admin/profil";
  const user = await getCurrentUser("admin");
  const erreur = (message: string): never =>
    redirectWithErreur(retour, message);

  const cle = `suppression-compte:${user.id}`;
  const attente = tentative(cle, ESSAIS, 15 * 60 * 1000);
  if (attente) {
    erreur(
      `Trop d’essais. Réessayez dans ${minutes(attente)} minute${minutes(attente) > 1 ? "s" : ""}.`,
    );
  }

  const compte = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { email: true, motDePasse: true, niveauEquipe: true },
  });
  if (!verifier(String(formData.get("motDePasse") ?? ""), compte.motDePasse)) {
    erreur(
      "Le mot de passe n’est pas le bon : le compte n’a pas été supprimé.",
    );
  }
  oublier(cle);

  if (compte.niveauEquipe === "administrateur") {
    const restants = await prisma.user.count({
      where: { role: "admin", niveauEquipe: "administrateur" },
    });
    if (restants <= 1) {
      erreur(
        "Vous êtes le dernier super admin : nommez-en un autre depuis « Équipe & accès » avant de supprimer votre compte.",
      );
    }
  }

  await prisma.$transaction([
    prisma.auditLog.create({
      data: {
        action: "compte_supprime",
        entite: "User",
        entiteId: user.id,
        acteur: user.nom,
        detail: `${user.nom} (${compte.email}) a supprimé son compte · équipe CanCham.`,
      },
    }),
    prisma.user.delete({ where: { id: user.id } }),
  ]);

  await fermerSession();
  revalidatePath("/", "layout");
  redirectWithFlash(
    "/auth",
    "Votre compte a été supprimé. Merci d’avoir fait partie du réseau CanCham.",
  );
}
