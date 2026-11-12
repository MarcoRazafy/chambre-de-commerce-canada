"use server";

import { revalidatePath } from "next/cache";
import { nomDepuisCourriel, telephoneValide } from "@/lib/accueil";
import { courrielsActifs, envoyerCourriel, urlPublique } from "@/lib/courriel";
import { exigerAdministrateur } from "@/lib/autorisations";
import { rattacherEquipe } from "@/lib/fil-equipe";
import { chambreCourante } from "@/lib/chambre-courante";
import { prisma, prismaSysteme } from "@/lib/db";
import { NIVEAU_EQUIPE_LABEL } from "@/lib/enums";
import { redirectWithErreur, redirectWithFlash } from "@/lib/flash";
import { courrielCompteEquipe } from "@/lib/modeles-courriels";
import { hacher, motDePasseProvisoire } from "@/lib/mots-de-passe";
import { getCurrentUser } from "@/lib/session";
import type { NiveauEquipe } from "@/lib/types";
import { ImageRefusee, enregistrerImage } from "@/lib/uploads";
import { supprimerVideo } from "@/lib/videos";

const texte = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function modifierProfilEquipe(formData: FormData) {
  const retour = "/admin/profil";
  const user = await getCurrentUser("admin");

  const nom = texte(formData, "nom").slice(0, 80);
  const fonction = texte(formData, "fonction").slice(0, 80);
  const email = texte(formData, "email").toLowerCase();
  const tel = texte(formData, "tel") || null;

  if (!nom || !fonction) {
    redirectWithErreur(retour, "Le nom et la fonction sont obligatoires.");
  }
  if (tel && !telephoneValide(tel)) {
    redirectWithErreur(
      retour,
      `« ${tel} » n’est pas un numéro de téléphone valide.`,
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirectWithErreur(retour, "Indiquez une adresse e-mail valide.");
  }
  // Une adresse = un seul espace : cherchée dans toutes les Chambres
  const pris = await prismaSysteme.user.findFirst({
    where: { email, id: { not: user.id } },
    select: { id: true },
  });
  if (pris) {
    redirectWithErreur(
      retour,
      `${email} est déjà utilisée par un autre compte.`,
    );
  }

  let photo: string | null = null;
  try {
    photo = await enregistrerImage(formData.get("photo"), {
      prefixe: `equipe-${user.id}`,
      largeur: 480,
    });
  } catch (e) {
    if (e instanceof ImageRefusee) redirectWithErreur(retour, e.message);
    throw e;
  }
  const retirerPhoto = texte(formData, "retirerPhoto") === "1";

  await prisma.user.update({
    where: { id: user.id },
    data: {
      nom,
      fonction,
      email,
      tel,
      ...(photo ? { photo } : retirerPhoto ? { photo: null } : {}),
    },
  });

  revalidatePath("/", "layout");
  redirectWithFlash(retour, "Profil mis à jour");
}

const EQUIPE = "/admin/abonnement?onglet=equipe";

function niveauSaisi(fd: FormData): NiveauEquipe {
  return texte(fd, "niveau") === "administrateur"
    ? "administrateur"
    : "manager";
}

const enClair = (n: NiveauEquipe) => NIVEAU_EQUIPE_LABEL[n].toLowerCase();

async function journal(
  action: string,
  userId: string,
  acteur: string,
  detail: string,
) {
  await prisma.auditLog.create({
    data: { action, entite: "User", entiteId: userId, acteur, detail },
  });
}

export async function creerCompteEquipe(formData: FormData) {
  const acteur = await exigerAdministrateur(EQUIPE);
  const email = texte(formData, "email").toLowerCase();
  const fonction = texte(formData, "fonction").slice(0, 80);
  const niveau = niveauSaisi(formData);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirectWithErreur(EQUIPE, "Indiquez une adresse e-mail valide.");
  }
  if (!fonction) redirectWithErreur(EQUIPE, "Indiquez sa fonction.");
  // Une adresse = un seul espace : cherchée dans toutes les Chambres (sans rien montrer d'une autre)
  const existant = await prismaSysteme.user.findUnique({
    where: { email },
    select: { role: true, chambreId: true },
  });
  if (existant && existant.chambreId !== (await chambreCourante())) {
    redirectWithErreur(EQUIPE, `${email} est déjà utilisée sur un autre espace.`);
  }
  if (existant) {
    redirectWithErreur(
      EQUIPE,
      existant.role === "admin"
        ? `${email} fait déjà partie de l’équipe.`
        : `${email} a déjà un compte de membre.`,
    );
  }

  const motDePasse = motDePasseProvisoire();
  const compte = await prisma.user.create({
    data: {
      role: "admin",
      niveauEquipe: niveau,
      nom: nomDepuisCourriel(email),
      fonction,
      email,
      motDePasse: hacher(motDePasse),
    },
    select: { id: true },
  });

  const envoye = await envoyerCourriel(
    courrielCompteEquipe(email, {
      fonction,
      niveau: enClair(niveau),
      motDePasse,
      lien: await urlPublique(`/auth?${new URLSearchParams({ email })}`),
    }),
  );
  if (!envoye && courrielsActifs()) {
    await prisma.user.delete({ where: { id: compte.id } });
    redirectWithErreur(
      EQUIPE,
      `L’e-mail n’a pas pu partir vers ${email} : le compte n’a pas été créé. Réessayez dans un instant.`,
    );
  }

  await rattacherEquipe();
  await journal(
    "equipe_ajoutee",
    compte.id,
    acteur.nom,
    `Compte d’équipe ouvert pour ${email} (${fonction}) · ${enClair(niveau)}.`,
  );
  revalidatePath("/", "layout");
  redirectWithFlash(
    EQUIPE,
    envoye
      ? `Compte ${enClair(niveau)} créé · identifiants envoyés à ${email}`
      : `Compte ${enClair(niveau)} créé · e-mails non configurés : identifiants écrits dans le journal du serveur`,
  );
}

export async function promouvoirAdmin(formData: FormData) {
  const acteur = await exigerAdministrateur(EQUIPE);
  const userId = texte(formData, "userId");
  const niveau = niveauSaisi(formData);

  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nom: true,
      email: true,
      role: true,
      memberId: true,
      member: {
        select: {
          id: true,
          nom: true,
          statut: true,
          video: true,
          _count: {
            select: {
              users: true,
              factures: true,
              inscriptions: true,
              produits: true,
            },
          },
        },
      },
    },
  });
  if (!u) redirectWithErreur(EQUIPE, "Compte introuvable.");
  if (u.role === "admin") {
    redirectWithErreur(EQUIPE, `${u.nom} fait déjà partie de l’équipe.`);
  }

  const fiche = u.member;
  const effacable =
    fiche !== null &&
    fiche.statut === "candidature" &&
    fiche._count.users === 1 &&
    fiche._count.factures === 0 &&
    fiche._count.inscriptions === 0 &&
    fiche._count.produits === 0;
  const supprimer = texte(formData, "supprimerFiche") === "1" && effacable;

  await prisma.user.update({
    where: { id: userId },
    data: {
      role: "admin",
      niveauEquipe: niveau,
      contactPrincipal: false,
      ...(supprimer ? { memberId: null } : {}),
    },
  });
  if (supprimer && fiche) {
    await prisma.member.delete({ where: { id: fiche.id } });
    await supprimerVideo(fiche.video);
  }

  await rattacherEquipe();
  await journal(
    "admin_promu",
    userId,
    acteur.nom,
    `${u.nom} (${u.email}) · ${enClair(niveau)}${
      supprimer && fiche ? ` · fiche « ${fiche.nom} » supprimée` : ""
    }.`,
  );
  revalidatePath("/", "layout");
  redirectWithFlash(
    EQUIPE,
    `${u.nom} rejoint l’équipe en tant que ${enClair(niveau)}${
      supprimer ? " · sa fiche de candidature a été supprimée" : ""
    }`,
  );
}

export async function retirerAdmin(formData: FormData) {
  const acteur = await exigerAdministrateur(EQUIPE);
  const userId = texte(formData, "userId");

  if (userId === acteur.id) {
    redirectWithErreur(
      EQUIPE,
      "Vous ne pouvez pas retirer votre propre accès : demandez-le à un autre super admin.",
    );
  }

  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, nom: true, email: true, role: true, memberId: true },
  });
  if (!u || u.role !== "admin") {
    redirectWithErreur(EQUIPE, "Ce compte ne fait pas partie de l’équipe.");
  }

  const role = u.memberId ? ("membre" as const) : ("visiteur" as const);
  await prisma.user.update({
    where: { id: userId },
    data: { role, niveauEquipe: null },
  });

  await journal(
    "admin_retire",
    userId,
    acteur.nom,
    `${u.nom} (${u.email}) · ${
      role === "membre" ? "redevenu compte membre" : "compte sans accès"
    }.`,
  );
  revalidatePath("/", "layout");
  redirectWithFlash(
    EQUIPE,
    `${u.nom} ne fait plus partie de l’équipe${
      role === "membre"
        ? " · son compte membre reste actif"
        : " · son compte n’a plus accès à la plateforme"
    }`,
  );
}

export async function changerNiveauEquipe(formData: FormData) {
  const acteur = await exigerAdministrateur(EQUIPE);
  const userId = texte(formData, "userId");
  const niveau = niveauSaisi(formData);

  if (userId === acteur.id) {
    redirectWithErreur(
      EQUIPE,
      "Vous ne pouvez pas changer votre propre rôle : demandez-le à un autre super admin.",
    );
  }
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { nom: true, email: true, role: true, niveauEquipe: true },
  });
  if (!u || u.role !== "admin") {
    redirectWithErreur(EQUIPE, "Ce compte ne fait pas partie de l’équipe.");
  }
  if ((u.niveauEquipe ?? "manager") === niveau) {
    redirectWithFlash(EQUIPE, `${u.nom} est déjà ${enClair(niveau)}`);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { niveauEquipe: niveau },
  });
  await journal(
    "niveau_equipe_modifie",
    userId,
    acteur.nom,
    `${u.nom} (${u.email}) · désormais ${enClair(niveau)}.`,
  );
  revalidatePath("/", "layout");
  redirectWithFlash(EQUIPE, `${u.nom} est désormais ${enClair(niveau)}`);
}
