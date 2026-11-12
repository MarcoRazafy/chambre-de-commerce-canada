"use server";

// Site public de la plateforme : créer une Chambre (son espace, son super admin), se connecter.
// Hors de toute Chambre : écritures sans limite de Chambre (prismaSysteme) ; la suite se fait dans la Chambre
// (avecChambre), puis un lien à usage unique ouvre la session à l'adresse de la Chambre (/auth/entree).
import { after } from "next/server";
import { redirect } from "next/navigation";
import { adresseOuSite } from "@/lib/adresse-chambre";
import { verifier } from "@/lib/auth";
import { avecChambre, oublierAdresses } from "@/lib/chambre-courante";
import { envoyerCourriel, gabarit } from "@/lib/courriel";
import { prismaSysteme as db } from "@/lib/db";
import { slugValide } from "@/lib/hote-chambre";
import { creerJeton } from "@/lib/jetons";
import { minutes, oublier, origineAppelante, tentative } from "@/lib/limite";
import { hacher, MOT_DE_PASSE_MIN } from "@/lib/mots-de-passe";

const texte = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max);
const ADRESSE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
const HEURE = 60 * 60 * 1000;

// Le lien qui ouvre la session dans la Chambre du compte
async function entree(chambreId: string, userId: string): Promise<string | null> {
  const adresse = await adresseOuSite(chambreId);
  if (!adresse) return null;
  const jeton = await avecChambre(chambreId, () => creerJeton(userId, "connexion"));
  return `${adresse}/auth/entree?${new URLSearchParams({ jeton })}`;
}

// --- Créer une Chambre ---

export async function creerChambre(formData: FormData) {
  const nomChambre = texte(formData, "nomChambre", 120);
  const slug = texte(formData, "slug", 63).toLowerCase();
  const nom = texte(formData, "nom", 100);
  const email = texte(formData, "email").toLowerCase();
  const motDePasse = String(formData.get("motDePasse") ?? "");
  const offreId = texte(formData, "offre", 50);

  // Erreur : retour au formulaire, saisie gardée (sauf le mot de passe)
  const erreur: (message: string) => never = (message) =>
    redirect(`/creer-une-chambre?${new URLSearchParams({ erreur: message, nomChambre, slug, nom, email, offre: offreId })}`);

  const origine = await origineAppelante();
  const attente = tentative(`creer-chambre:${origine}`, 5, HEURE);
  if (attente) erreur(`Trop de créations depuis cette connexion. Réessayez dans ${minutes(attente)} minute${minutes(attente) > 1 ? "s" : ""}.`);

  if (!nomChambre) erreur("Indiquez le nom de la Chambre.");
  if (!slugValide(slug)) erreur("L’adresse : lettres minuscules, chiffres et tirets (ex. ma-chambre).");
  if (!nom) erreur("Indiquez votre nom.");
  if (!ADRESSE.test(email)) erreur("Indiquez une adresse e-mail valide.");
  if (motDePasse.length < MOT_DE_PASSE_MIN) erreur(`Le mot de passe fait au moins ${MOT_DE_PASSE_MIN} caractères.`);
  const offre = await db.offre.findUnique({ where: { id: offreId }, select: { id: true, nom: true } });
  if (!offre) erreur("Choisissez une offre.");
  if (await db.chambre.findUnique({ where: { slug }, select: { id: true } })) erreur(`L’adresse « ${slug} » est déjà prise.`);
  // Une adresse e-mail = un seul espace
  if (await db.user.findUnique({ where: { email }, select: { id: true } })) erreur("Cette adresse e-mail a déjà un compte : connectez-vous.");

  let creee: { chambreId: string; userId: string };
  try {
    creee = await db.$transaction(async (tx) => {
      const c = await tx.chambre.create({ data: { slug, nom: nomChambre, offreId: offre.id }, select: { id: true } });
      await tx.profilChambre.create({ data: { chambreId: c.id, nom: nomChambre, email } });
      const u = await tx.user.create({
        data: { chambreId: c.id, role: "admin", niveauEquipe: "administrateur", nom, fonction: "", email, motDePasse: hacher(motDePasse) },
        select: { id: true },
      });
      await tx.auditLog.create({
        data: { chambreId: c.id, action: "chambre_creee", entite: "Chambre", entiteId: c.id, acteur: nom, detail: `Espace créé, offre ${offre.nom}.` },
      });
      return { chambreId: c.id, userId: u.id };
    });
  } catch (e) {
    // Prise entre-temps (même adresse ou même courriel au même moment)
    if ((e as { code?: string }).code === "P2002") erreur("Cette adresse ou cet e-mail vient d’être pris : réessayez.");
    throw e;
  }
  oublierAdresses();

  const lien = await entree(creee.chambreId, creee.userId);
  const adresse = await adresseOuSite(creee.chambreId);
  // Le courriel de bienvenue : l'adresse de l'espace, à garder
  after(() =>
    avecChambre(creee.chambreId, async () => {
      if (!adresse) return;
      const { html, texte: brut } = gabarit({
        titre: "Votre espace est prêt",
        paragraphes: [`Bonjour ${nom.split(/\s+/)[0]},`, `L’espace de ${nomChambre} est à l’adresse ${adresse.replace(/^https?:\/\//, "")}.`],
        bouton: { libelle: "Ouvrir mon espace", url: `${adresse}/auth` },
      });
      await envoyerCourriel({ a: email, sujet: `Votre espace ${nomChambre}`, html, texte: brut });
    }),
  );
  redirect(lien ?? "/connexion");
}

// --- Se connecter depuis le site de la plateforme ---

const ESSAIS_PAR_COMPTE = 8;
const ESSAIS_PAR_ORIGINE = 30;
const FENETRE = 15 * 60 * 1000;

export async function connexionPlateforme(formData: FormData) {
  const email = texte(formData, "email").toLowerCase();
  const motDePasse = String(formData.get("motDePasse") ?? "");
  const echec: (message: string) => never = (message) => redirect(`/connexion?${new URLSearchParams({ erreur: message, email })}`);
  if (!email || !motDePasse) echec("Indiquez votre adresse et votre mot de passe.");

  const origine = await origineAppelante();
  const attente = Math.max(
    tentative(`connexion:${origine}:${email}`, ESSAIS_PAR_COMPTE, FENETRE),
    tentative(`connexion:${origine}`, ESSAIS_PAR_ORIGINE, FENETRE),
  );
  if (attente) echec(`Trop de tentatives de connexion. Réessayez dans ${minutes(attente)} minute${minutes(attente) > 1 ? "s" : ""}.`);

  const u = await db.user.findUnique({
    where: { email },
    select: { id: true, role: true, motDePasse: true, chambreId: true, member: { select: { statut: true } } },
  });
  if (!u || u.role === "visiteur" || !verifier(motDePasse, u.motDePasse)) echec("Adresse ou mot de passe incorrect.");
  if (u.member?.statut === "candidature") echec("Votre demande d’adhésion est en cours d’examen.");
  if (u.member?.statut === "refusee") echec("Votre demande d’adhésion n’a pas été retenue.");

  oublier(`connexion:${origine}:${email}`);
  const lien = await entree(u.chambreId, u.id);
  if (!lien) echec("Votre espace n’a pas encore d’adresse : écrivez à la plateforme.");
  redirect(lien);
}
