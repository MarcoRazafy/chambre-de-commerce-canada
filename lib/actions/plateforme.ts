"use server";

// Site public de la plateforme : créer une Chambre (son espace, son super admin), se connecter.
// Hors de toute Chambre : écritures sans limite de Chambre (prismaSysteme) ; la suite se fait dans la Chambre
// (avecChambre), puis un lien à usage unique ouvre la session à l'adresse de la Chambre (/auth/entree).
import { after } from "next/server";
import { redirect } from "next/navigation";
import { adresseOuSite } from "@/lib/adresse-chambre";
import { alerterGM } from "@/lib/alertes-gm";
import { verifier } from "@/lib/auth";
import { avecChambre, oublierAdresses } from "@/lib/chambre-courante";
import { envoyerCourriel, gabarit, urlPublique } from "@/lib/courriel";
import { estFonction } from "@/lib/fonctions-plateforme";
import { prismaSysteme as db } from "@/lib/db";
import { slugValide } from "@/lib/hote-chambre";
import { creerJeton } from "@/lib/jetons";
import { minutes, oublier, origineAppelante, tentative } from "@/lib/limite";
import { courrielReinitialisation } from "@/lib/modeles-courriels";
import { hacher, MOT_DE_PASSE_MIN } from "@/lib/mots-de-passe";

const texte = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max);
const ADRESSE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
const HEURE = 60 * 60 * 1000;

// Le lien qui ouvre la session dans la Chambre du compte ; « choix » : l'offre (et ses fonctions) choisie sur le
// site, présélectionnée au démarrage
async function entree(chambreId: string, userId: string, choix: Record<string, string> = {}): Promise<string | null> {
  const adresse = await adresseOuSite(chambreId);
  if (!adresse) return null;
  const jeton = await avecChambre(chambreId, () => creerJeton(userId, "connexion"));
  const plus = Object.fromEntries(Object.entries(choix).filter(([, v]) => v));
  return `${adresse}/auth/entree?${new URLSearchParams({ jeton, ...plus })}`;
}

// --- Créer une Chambre ---
// L'inscription seule (la Chambre, son super admin) ; l'offre, le paiement et les informations se font ensuite,
// dans l'espace de la Chambre (/demarrage)

export async function creerChambre(formData: FormData) {
  const nomChambre = texte(formData, "nomChambre", 120);
  const slug = texte(formData, "slug", 63).toLowerCase();
  const nom = texte(formData, "nom", 100);
  const email = texte(formData, "email").toLowerCase();
  const motDePasse = String(formData.get("motDePasse") ?? "");
  // L'offre choisie sur le site, s'il y en a une : présélectionnée au démarrage
  const offreId = texte(formData, "offre", 50);
  const fonctions = texte(formData, "fonctions", 300).split(",").filter(estFonction).join(",");

  // Erreur : retour au formulaire, saisie gardée (sauf le mot de passe)
  const erreur: (message: string) => never = (message) =>
    redirect(`/creer-une-chambre?${new URLSearchParams({ erreur: message, nomChambre, slug, nom, email, offre: offreId, fonctions })}`);

  const origine = await origineAppelante();
  const attente = tentative(`creer-chambre:${origine}`, 5, HEURE);
  if (attente) erreur(`Trop de créations depuis cette connexion. Réessayez dans ${minutes(attente)} minute${minutes(attente) > 1 ? "s" : ""}.`);

  if (!nomChambre) erreur("Indiquez le nom de la Chambre.");
  if (!slugValide(slug)) erreur("L’adresse : lettres minuscules, chiffres et tirets (ex. ma-chambre).");
  if (!nom) erreur("Indiquez votre nom.");
  if (!ADRESSE.test(email)) erreur("Indiquez une adresse e-mail valide.");
  if (motDePasse.length < MOT_DE_PASSE_MIN) erreur(`Le mot de passe fait au moins ${MOT_DE_PASSE_MIN} caractères.`);
  if (await db.chambre.findUnique({ where: { slug }, select: { id: true } })) erreur(`L’adresse « ${slug} » est déjà prise.`);
  // Une adresse e-mail = un seul espace
  if (await db.user.findUnique({ where: { email }, select: { id: true } })) erreur("Cette adresse e-mail a déjà un compte : connectez-vous.");

  let creee: { chambreId: string; userId: string };
  try {
    creee = await db.$transaction(async (tx) => {
      const c = await tx.chambre.create({ data: { slug, nom: nomChambre, demarrage: "offre" }, select: { id: true } });
      await tx.profilChambre.create({ data: { chambreId: c.id, nom: nomChambre, email } });
      const u = await tx.user.create({
        data: { chambreId: c.id, role: "admin", niveauEquipe: "administrateur", nom, fonction: "", email, motDePasse: hacher(motDePasse) },
        select: { id: true },
      });
      await tx.auditLog.create({
        data: { chambreId: c.id, action: "chambre_creee", entite: "Chambre", entiteId: c.id, acteur: nom, detail: "Espace créé." },
      });
      return { chambreId: c.id, userId: u.id };
    });
  } catch (e) {
    // Prise entre-temps (même adresse ou même courriel au même moment)
    if ((e as { code?: string }).code === "P2002") erreur("Cette adresse ou cet e-mail vient d’être pris : réessayez.");
    throw e;
  }
  oublierAdresses();

  const lien = await entree(creee.chambreId, creee.userId, { offre: offreId, fonctions });
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
      await alerterGM({
        sujet: `Nouvelle Chambre : ${nomChambre}`,
        titre: "Nouvelle Chambre",
        paragraphes: [`${nom} (${email}) vient de créer la Chambre ${nomChambre}, à l’adresse ${adresse.replace(/^https?:\/\//, "")}.`, "Son démarrage (offre, paiement, informations) est en cours."],
        chambreId: creee.chambreId,
      });
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

// --- Mot de passe oublié depuis le site de la plateforme ---
// Le compte est cherché dans toutes les Chambres ; le lien part de la sienne et mène à son adresse.
// La réponse ne dit pas si l'adresse a un compte.

const OUBLI = "/mot-de-passe-oublie";

export async function demanderReinitialisationPlateforme(formData: FormData) {
  const email = texte(formData, "email").toLowerCase();
  const vers = (params: Record<string, string>): never => redirect(`${OUBLI}?${new URLSearchParams(params)}`);
  if (!ADRESSE.test(email)) vers({ erreur: "Indiquez une adresse e-mail valide.", email });

  const origine = await origineAppelante();
  const attente = Math.max(tentative(`oubli:${email}`, 3, HEURE), tentative(`oubli:${origine}`, 10, HEURE));
  if (attente) vers({ erreur: `Trop de demandes. Réessayez dans ${minutes(attente)} minute${minutes(attente) > 1 ? "s" : ""}.`, email });

  after(async () => {
    const u = await db.user.findUnique({ where: { email }, select: { id: true, nom: true, role: true, chambreId: true } });
    if (!u || u.role === "visiteur") return;
    await avecChambre(u.chambreId, async () => {
      const base = await urlPublique("/auth/nouveau-mot-de-passe");
      const jeton = await creerJeton(u.id, "reinitialisation");
      await envoyerCourriel(courrielReinitialisation(email, u.nom, `${base}?jeton=${jeton}`)).catch((e) => console.error("[plateforme] courriel de réinitialisation", e));
    });
  });
  vers({ envoye: email });
}

// --- Contact depuis le site (sans compte) : le message arrive à l'Admin GM ---

export async function envoyerContact(formData: FormData) {
  const nom = texte(formData, "nom", 100);
  const email = texte(formData, "email").toLowerCase();
  const message = String(formData.get("message") ?? "").replace(/\r\n/g, "\n").trim().slice(0, 3000);
  const vers = (params: Record<string, string>): never => redirect(`/contact?${new URLSearchParams(params)}`);
  const saisies = { nom, email, message: message.slice(0, 1000) };
  // Champ piège rempli : un robot ; on répond comme si c'était envoyé
  if (texte(formData, "site", 50)) vers({ envoye: "1" });
  if (!nom) vers({ erreur: "Indiquez votre nom.", ...saisies });
  if (!ADRESSE.test(email)) vers({ erreur: "Indiquez une adresse e-mail valide.", ...saisies });
  if (message.length < 10) vers({ erreur: "Écrivez votre message.", ...saisies });

  const origine = await origineAppelante();
  const attente = tentative(`contact:${origine}`, 3, HEURE);
  if (attente) vers({ erreur: `Trop de messages. Réessayez dans ${minutes(attente)} minute${minutes(attente) > 1 ? "s" : ""}.`, ...saisies });

  after(() =>
    alerterGM({
      sujet: `Contact : ${nom}`,
      titre: "Message depuis le site",
      paragraphes: [`${nom} (${email}) écrit :`, ...message.split(/\n+/)],
    }),
  );
  vers({ envoye: "1" });
}
