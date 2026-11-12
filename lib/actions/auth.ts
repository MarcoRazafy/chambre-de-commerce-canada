"use server";

import { redirect } from "next/navigation";
import { prismaSysteme } from "@/lib/db";
import { fermerSession, ouvrirSession, verifier } from "@/lib/auth";
import { minutes, oublier, origineAppelante, tentative } from "@/lib/limite";

const texte = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

const ESSAIS_PAR_COMPTE = 8;
const ESSAIS_PAR_ORIGINE = 30;
const FENETRE = 15 * 60 * 1000;

const ACCUEIL: Record<string, string> = {
  membre: "/membre",
  admin: "/admin",
  visiteur: "/membre/profil",
};

function echec(message: string, email: string, suite = ""): never {
  const q = new URLSearchParams({ erreur: message });
  if (email) q.set("email", email);
  if (suite.startsWith("/") && !suite.startsWith("//")) q.set("suite", suite);
  redirect(`/auth?${q}`);
}

export async function connexion(formData: FormData) {
  const email = texte(formData, "email").toLowerCase();
  const motDePasse = String(formData.get("motDePasse") ?? "");
  const suite = texte(formData, "suite");

  if (!email || !motDePasse) {
    echec("Indiquez votre adresse et votre mot de passe.", email, suite);
  }

  const origine = await origineAppelante();
  const attente = Math.max(
    tentative(`connexion:${origine}:${email}`, ESSAIS_PAR_COMPTE, FENETRE),
    tentative(`connexion:${origine}`, ESSAIS_PAR_ORIGINE, FENETRE),
  );
  if (attente) {
    echec(
      `Trop de tentatives de connexion. Réessayez dans ${minutes(attente)} minute${
        minutes(attente) > 1 ? "s" : ""
      }.`,
      email,
      suite,
    );
  }

  // Avant la connexion, la Chambre n'est pas connue : le compte est cherché partout (une adresse = un seul espace)
  const u = await prismaSysteme.user.findUnique({
    where: { email },
    select: {
      id: true,
      role: true,
      motDePasse: true,
      member: { select: { accueilEnCours: true, statut: true } },
    },
  });

  if (u && u.role === "membre" && !u.motDePasse) {
    echec(
      u.member?.statut === "candidature"
        ? "Votre demande d’adhésion est en cours d’examen. Dès qu’elle sera validée, vous recevrez un e-mail pour créer votre mot de passe."
        : "Votre accès n’est pas encore ouvert : l’équipe CanCham vous enverra un e-mail pour créer votre mot de passe.",
      email,
      suite,
    );
  }

  if (!u || !verifier(motDePasse, u.motDePasse)) {
    echec("Adresse ou mot de passe incorrect.", email, suite);
  }

  if (u.role === "membre" && u.member?.statut === "refusee") {
    oublier(`connexion:${origine}:${email}`);
    echec(
      "Votre demande d’adhésion n’a pas été retenue. Écrivez à la chambre si vous pensez qu’il s’agit d’une erreur.",
      email,
      suite,
    );
  }

  if (u.role === "membre" && u.member?.statut === "candidature") {
    oublier(`connexion:${origine}:${email}`);
    redirect(`/auth?${new URLSearchParams({ attente: "1", email })}`);
  }

  oublier(`connexion:${origine}:${email}`);
  await ouvrirSession(u.id, texte(formData, "souvenir") === "1");

  if (u.role === "membre" && u.member?.accueilEnCours) redirect("/bienvenue");

  const accueil = ACCUEIL[u.role] ?? "/membre";
  const sienne = suite === `/${u.role}` || suite.startsWith(`/${u.role}/`);
  redirect(sienne ? suite : accueil);
}

export async function deconnexion() {
  await fermerSession();
  redirect("/auth");
}
