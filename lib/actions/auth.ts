"use server";

import { redirect } from "next/navigation";
import { adresseDeLaChambre } from "@/lib/adresse-chambre";
import { hoteActuel } from "@/lib/chambre-courante";
import { prismaSysteme } from "@/lib/db";
import { lienEntree } from "@/lib/entree-chambre";
import { espaceDuRole } from "@/lib/hote-chambre";
import { fermerSession, ouvrirSession, sessionCourante } from "@/lib/auth";
import { comptesDeLAdresse, comptesDuChoix, comptesDuMotDePasse, comptesLies, comptesOuverts, lierComptes, lireChoix, scellerChoix } from "@/lib/comptes-lies";
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

  const comptes = await comptesDeLAdresse(email);
  const valides = comptesDuMotDePasse(comptes, motDePasse);
  const ici = await hoteActuel();

  if (!valides.length) {
    const sansMotDePasse = comptes.find((c) => c.role === "membre" && !c.motDePasse && (ici.partage || c.chambreId === ici.chambreId));
    if (sansMotDePasse) {
      echec(
        sansMotDePasse.member?.statut === "candidature"
          ? "Votre demande d’adhésion est en cours d’examen. Dès qu’elle sera validée, vous recevrez un e-mail pour créer votre mot de passe."
          : "Votre accès n’est pas encore ouvert : l’équipe de votre Chambre vous enverra un e-mail pour créer votre mot de passe.",
        email,
        suite,
      );
    }
    echec("Adresse ou mot de passe incorrect.", email, suite);
  }

  await lierComptes(valides.map((c) => c.id));
  const ouverts = comptesOuverts(valides);
  const dIci = ici.partage ? null : valides.find((c) => c.chambreId === ici.chambreId);
  if (!dIci && ouverts.length > 1) {
    oublier(`connexion:${origine}:${email}`);
    const q = new URLSearchParams({ j: scellerChoix(ouverts.map((c) => c.id)) });
    if (suite.startsWith("/") && !suite.startsWith("//")) q.set("suite", suite);
    redirect(`/auth/choisir?${q}`);
  }
  const u = dIci ?? ouverts[0] ?? valides[0];

  if (!ici.partage && u.chambreId !== ici.chambreId) {
    const adresse = await adresseDeLaChambre(u.chambreId, espaceDuRole(u.role));
    if (adresse) redirect(`${adresse}/auth?${new URLSearchParams({ email })}`);
    echec("Ce compte appartient à un autre espace.", email, suite);
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
  const sienne = suite === `/${u.role}` || suite.startsWith(`/${u.role}/`);
  if (ici.partage && ici.partage !== espaceDuRole(u.role)) {
    const lien = await lienEntree(u.chambreId, u.id, { suite: sienne ? suite : "" });
    if (lien) redirect(lien);
  }
  await ouvrirSession(u.id, texte(formData, "souvenir") === "1");

  if (u.role === "membre" && (await accueilEnCours(u.id))) redirect("/bienvenue");

  const accueil = ACCUEIL[u.role] ?? "/membre";
  redirect(sienne ? suite : accueil);
}

async function accueilEnCours(userId: string): Promise<boolean> {
  const u = await prismaSysteme.user.findUnique({ where: { id: userId }, select: { member: { select: { accueilEnCours: true } } } });
  return !!u?.member?.accueilEnCours;
}

async function entrerDans(compte: { id: string; chambreId: string; role: string }, suite: string): Promise<never> {
  const sienne = suite === `/${compte.role}` || suite.startsWith(`/${compte.role}/`);
  const ici = await hoteActuel();
  const memeAdresse = ici.partage ? ici.partage === espaceDuRole(compte.role) : ici.chambreId === compte.chambreId;
  if (memeAdresse) {
    await ouvrirSession(compte.id);
    if (compte.role === "membre" && (await accueilEnCours(compte.id))) redirect("/bienvenue");
    redirect(sienne ? suite : (ACCUEIL[compte.role] ?? "/membre"));
  }
  const lien = await lienEntree(compte.chambreId, compte.id, { suite: sienne ? suite : "" });
  if (!lien) echec("Cet espace n’a pas encore d’adresse : écrivez à la plateforme.", "", suite);
  redirect(lien);
}

export async function choisirCompte(formData: FormData) {
  const jeton = texte(formData, "j");
  const id = texte(formData, "compte");
  const suite = texte(formData, "suite");
  const permis = lireChoix(jeton);
  if (!permis?.includes(id)) echec("Ce choix a expiré : connectez-vous à nouveau.", "", suite);
  const compte = (await comptesDuChoix(jeton)).find((c) => c.id === id);
  if (!compte) echec("Ce compte n’est plus disponible.", "", suite);
  await entrerDans(compte, suite);
}

export async function basculerCompte(formData: FormData) {
  const session = await sessionCourante();
  if (!session) redirect("/auth");
  const id = texte(formData, "compte");
  const lies = await comptesLies(session.userId);
  const cible = lies?.autres.find((c) => c.id === id);
  if (!cible) redirect("/membre");
  await entrerDans(cible, "");
}

export async function deconnexion() {
  await fermerSession();
  redirect("/auth");
}
