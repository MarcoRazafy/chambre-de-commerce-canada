import "server-only";

import { prisma } from "@/lib/db";
import { redirectWithErreur } from "@/lib/flash";
import { getCurrentUser, utilisateurConnecte } from "@/lib/session";
import type { User } from "@/lib/types";

const REFUS = "Vous n’avez pas accès à cette fiche.";

export async function exigerEquipe(): Promise<User> {
  return getCurrentUser("admin");
}

export function estAdministrateur(user: Pick<User, "niveauEquipe">): boolean {
  return user.niveauEquipe === "administrateur";
}

export async function exigerAdministrateur(retour: string): Promise<User> {
  const user = await getCurrentUser("admin");
  if (!estAdministrateur(user)) {
    redirectWithErreur(
      retour,
      "Réservé aux super admins : un admin ne gère pas les accès de l’équipe.",
    );
  }
  return user;
}

export interface AccesFiche {
  user: User;
  memberId: string;
  estEquipe: boolean;
}

export async function exigerFiche(
  memberIdDemande: string,
  retour = "/membre/profil",
): Promise<AccesFiche> {
  const equipe = retour.startsWith("/admin");
  const user = await getCurrentUser(equipe ? "admin" : "membre");

  if (user.role === "admin") {
    if (!memberIdDemande) redirectWithErreur(retour, "Fiche introuvable.");
    return { user, memberId: memberIdDemande, estEquipe: true };
  }
  if (!user.memberId) redirectWithErreur(retour, REFUS);
  if (memberIdDemande && memberIdDemande !== user.memberId) {
    redirectWithErreur(retour, REFUS);
  }
  return { user, memberId: user.memberId, estEquipe: false };
}

export async function ficheParApi(memberIdDemande: string): Promise<
  | {
      ok: true;
      userId: string;
      nom: string;
      memberId: string;
      estEquipe: boolean;
    }
  | { ok: false; statut: 401 | 403 | 404; erreur: string }
> {
  const user = await utilisateurConnecte();
  if (!user) return { ok: false, statut: 401, erreur: "Connexion requise." };

  if (user.role === "admin") {
    const existe = memberIdDemande
      ? await prisma.member.findUnique({
          where: { id: memberIdDemande },
          select: { id: true },
        })
      : null;
    return existe
      ? {
          ok: true,
          userId: user.id,
          nom: user.nom,
          memberId: existe.id,
          estEquipe: true,
        }
      : { ok: false, statut: 404, erreur: "Fiche introuvable." };
  }
  if (
    user.role !== "membre" ||
    !user.memberId ||
    (memberIdDemande && memberIdDemande !== user.memberId)
  ) {
    return { ok: false, statut: 403, erreur: REFUS };
  }
  return {
    ok: true,
    userId: user.id,
    nom: user.nom,
    memberId: user.memberId,
    estEquipe: false,
  };
}

export async function exigerProduit(
  produitId: string,
  retour = "/membre/profil",
): Promise<{ user: User; memberId: string; estEquipe: boolean }> {
  const produit = await prisma.produit.findUnique({
    where: { id: produitId },
    select: { memberId: true },
  });
  if (!produit) redirectWithErreur(retour, "Offre introuvable.");
  return exigerFiche(produit.memberId, retour);
}

export async function exigerContact(
  contactId: string,
  retour = "/membre/profil",
): Promise<{ user: User; memberId: string; estEquipe: boolean }> {
  const contact = await prisma.user.findUnique({
    where: { id: contactId },
    select: { memberId: true, role: true },
  });
  // Un compte d’équipe garde son entreprise : ce n’est pas pour autant un
  // contact que ses collègues, ou un manager, peuvent modifier ou supprimer.
  if (!contact?.memberId || contact.role !== "membre") {
    redirectWithErreur(retour, "Contact introuvable.");
  }
  return exigerFiche(contact.memberId, retour);
}
