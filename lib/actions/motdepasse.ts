"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { avecChambre } from "@/lib/chambre-courante";
import { prisma, prismaSysteme } from "@/lib/db";
import { hacher, MOT_DE_PASSE_MIN, ouvrirSession, verifier } from "@/lib/auth";
import { envoyerCourriel, urlPublique } from "@/lib/courriel";
import { redirectWithErreur, redirectWithFlash } from "@/lib/flash";
import { creerJeton, jetonValide } from "@/lib/jetons";
import { minutes, oublier, origineAppelante, tentative } from "@/lib/limite";
import { courrielReinitialisation } from "@/lib/modeles-courriels";
import { getCurrentUser } from "@/lib/session";

const texte = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

const OUBLI = "/auth/mot-de-passe-oublie";
const NOUVEAU = "/auth/nouveau-mot-de-passe";

const DEMANDES_PAR_ADRESSE = 3;
const DEMANDES_PAR_ORIGINE = 10;
const HEURE = 60 * 60 * 1000;

function vers(chemin: string, params: Record<string, string>): never {
  redirect(`${chemin}?${new URLSearchParams(params)}`);
}

export async function demanderReinitialisation(formData: FormData) {
  const email = texte(formData, "email").toLowerCase();
  if (!email.includes("@")) {
    vers(OUBLI, { erreur: "Indiquez une adresse courriel valide.", email });
  }

  const origine = await origineAppelante();
  const attente = Math.max(
    tentative(`oubli:${email}`, DEMANDES_PAR_ADRESSE, HEURE),
    tentative(`oubli:${origine}`, DEMANDES_PAR_ORIGINE, HEURE),
  );
  if (attente) {
    vers(OUBLI, {
      erreur: `Trop de demandes. Réessayez dans ${minutes(attente)} minute${
        minutes(attente) > 1 ? "s" : ""
      }.`,
      email,
    });
  }

  const base = await urlPublique(NOUVEAU);
  after(async () => {
    // Sans session : le compte est cherché dans toutes les Chambres, la suite se fait dans la sienne
    const u = await prismaSysteme.user.findUnique({
      where: { email },
      select: { id: true, nom: true, role: true, chambreId: true },
    });
    if (!u || u.role === "visiteur") return;
    await avecChambre(u.chambreId, async () => {
      const jeton = await creerJeton(u.id, "reinitialisation");
      await envoyerCourriel(
        courrielReinitialisation(email, u.nom, `${base}?jeton=${jeton}`),
      );
    });
  });

  vers(OUBLI, { envoye: email });
}

export async function definirMotDePasse(formData: FormData) {
  const brut = texte(formData, "jeton");
  const motDePasse = String(formData.get("motDePasse") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  const jeton = await jetonValide(brut);
  if (!jeton) {
    vers(OUBLI, {
      erreur:
        "Ce lien n’est plus valable. Demandez-en un nouveau : il arrive en quelques secondes.",
    });
  }
  if (motDePasse.length < MOT_DE_PASSE_MIN) {
    vers(NOUVEAU, {
      jeton: brut,
      erreur: `Le mot de passe fait au moins ${MOT_DE_PASSE_MIN} caractères.`,
    });
  }
  if (motDePasse !== confirmation) {
    vers(NOUVEAU, {
      jeton: brut,
      erreur: "Les deux mots de passe ne correspondent pas.",
    });
  }

  const { user } = jeton;
  const invitation = jeton.usage === "invitation";
  await avecChambre(user.chambreId, () => prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { motDePasse: hacher(motDePasse), motDePasseModifieLe: new Date() },
    }),
    prisma.jetonCompte.update({
      where: { id: jeton.id },
      data: { utiliseLe: new Date() },
    }),
    prisma.jetonCompte.deleteMany({
      where: { userId: user.id, utiliseLe: null },
    }),
    prisma.auditLog.create({
      data: {
        action: invitation ? "acces_active" : "mot_de_passe_reinitialise",
        entite: user.memberId ? "Member" : "User",
        entiteId: user.memberId ?? user.id,
        acteur: user.nom,
        detail: invitation
          ? `${user.email} a choisi son mot de passe et activé son accès.`
          : `${user.email} a réinitialisé son mot de passe.`,
      },
    }),
  ]));

  await ouvrirSession(user.id);
  const message = invitation
    ? "Bienvenue ! Votre accès est activé"
    : "Mot de passe modifié";
  if (user.role === "admin") redirectWithFlash("/admin", message);
  if (user.member?.accueilEnCours) redirect("/bienvenue");
  redirectWithFlash("/membre", message);
}

const ESSAIS_CHANGEMENT = 5;

export async function changerMonMotDePasse(formData: FormData) {
  const retour = "/admin/profil";
  const user = await getCurrentUser("admin");
  const actuel = String(formData.get("actuel") ?? "");
  const nouveau = String(formData.get("nouveau") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  const erreur = (message: string): never =>
    redirectWithErreur(retour, message);

  const cle = `changement:${user.id}`;
  const attente = tentative(cle, ESSAIS_CHANGEMENT, 15 * 60 * 1000);
  if (attente) {
    erreur(
      `Trop d’essais. Réessayez dans ${minutes(attente)} minute${minutes(attente) > 1 ? "s" : ""}.`,
    );
  }
  const compte = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { motDePasse: true, email: true },
  });
  if (!verifier(actuel, compte.motDePasse)) {
    erreur("Le mot de passe actuel n’est pas le bon.");
  }
  if (nouveau.length < MOT_DE_PASSE_MIN) {
    erreur(
      `Le nouveau mot de passe fait au moins ${MOT_DE_PASSE_MIN} caractères.`,
    );
  }
  if (nouveau !== confirmation) {
    erreur("Les deux nouveaux mots de passe ne correspondent pas.");
  }
  if (nouveau === actuel) {
    erreur("Choisissez un mot de passe différent de l’actuel.");
  }

  oublier(cle);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { motDePasse: hacher(nouveau), motDePasseModifieLe: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        action: "mot_de_passe_modifie",
        entite: "User",
        entiteId: user.id,
        acteur: user.nom,
        detail: `${compte.email} a changé son mot de passe.`,
      },
    }),
  ]);
  await ouvrirSession(user.id);
  redirectWithFlash(
    retour,
    "Mot de passe modifié · vos autres sessions sont fermées",
  );
}
