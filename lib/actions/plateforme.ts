"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { adresseEspace, adresseOuSite } from "@/lib/adresse-chambre";
import { alerterGM } from "@/lib/alertes-gm";
import { comptesDeLAdresse, comptesDuMotDePasse, comptesOuverts, lierComptes, scellerChoix } from "@/lib/comptes-lies";
import { avecChambre, oublierAdresses } from "@/lib/chambre-courante";
import { envoyerCourriel, gabarit, urlPublique } from "@/lib/courriel";
import { estFonction } from "@/lib/fonctions-plateforme";
import { numeroComplet, PAYS, telephoneValide } from "@/lib/accueil";
import { appliquerOffre } from "@/lib/demarrage";
import { offresPubliques } from "@/lib/plateforme-site";
import { prismaSysteme as db } from "@/lib/db";
import { slugValide } from "@/lib/hote-chambre";
import { lienEntree } from "@/lib/entree-chambre";
import { creerJeton } from "@/lib/jetons";
import { minutes, oublier, origineAppelante, tentative } from "@/lib/limite";
import { courrielReinitialisation } from "@/lib/modeles-courriels";
import { hacher, MOT_DE_PASSE_MIN } from "@/lib/mots-de-passe";

const texte = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max);
const ADRESSE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
const HEURE = 60 * 60 * 1000;

const entree = lienEntree;

const versIdentifiant = (nom: string) =>
  nom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/, "");

async function identifiantLibre(nom: string): Promise<string> {
  const base = slugValide(versIdentifiant(nom)) ? versIdentifiant(nom) : `chambre-${versIdentifiant(nom) || "nouvelle"}`.slice(0, 50).replace(/-+$/, "");
  for (let i = 1; i < 50; i++) {
    const essai = i === 1 ? base : `${base}-${i}`;
    if (slugValide(essai) && !(await db.chambre.findUnique({ where: { slug: essai }, select: { id: true } }))) return essai;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function creerChambre(formData: FormData) {
  const nomChambre = texte(formData, "nomChambre", 120);
  const nomFamille = texte(formData, "nom", 60);
  const prenom = texte(formData, "prenom", 60);
  const nom = [prenom, nomFamille].filter(Boolean).join(" ");
  const email = texte(formData, "email").toLowerCase();
  const indicatif = texte(formData, "indicatif", 8);
  const numero = texte(formData, "tel", 24);
  const telephone = numeroComplet(indicatif, numero);
  const ville = texte(formData, "ville", 80);
  const paysSaisi = texte(formData, "pays", 40);
  const pays = (PAYS as readonly string[]).includes(paysSaisi) ? paysSaisi : "Madagascar";
  const motDePasse = String(formData.get("motDePasse") ?? "");
  const offreId = texte(formData, "offre", 50);
  const fonctions = formData.getAll("fonctions").flatMap((v) => String(v).split(",")).filter(estFonction);

  const erreur: (message: string) => never = (message) =>
    redirect(`/creer-une-chambre?${new URLSearchParams({ erreur: message, nomChambre, nom: nomFamille, prenom, email, indicatif, tel: numero, ville, pays, offre: offreId, fonctions: fonctions.join(",") })}`);

  const origine = await origineAppelante();
  const attente = tentative(`creer-chambre:${origine}`, 5, HEURE);
  if (attente) erreur(`Trop de créations depuis cette connexion. Réessayez dans ${minutes(attente)} minute${minutes(attente) > 1 ? "s" : ""}.`);

  if (!nomFamille || !prenom) erreur("Indiquez votre nom et votre prénom.");
  if (!ADRESSE.test(email)) erreur("Indiquez une adresse e-mail valide.");
  if (!numero) erreur("Indiquez votre numéro de téléphone.");
  if (!telephoneValide(telephone)) erreur(`« ${numero} » n’est pas un numéro de téléphone valide.`);
  if (!ville) erreur("Indiquez votre ville.");
  if (!nomChambre) erreur("Indiquez le nom de la Chambre.");
  if (!(await offresPubliques()).some((o) => o.id === offreId)) erreur("Choisissez une offre.");
  if (motDePasse.length < MOT_DE_PASSE_MIN) erreur(`Le mot de passe fait au moins ${MOT_DE_PASSE_MIN} caractères.`);
  if (await db.user.findFirst({ where: { email }, select: { id: true } })) erreur("Cette adresse e-mail a déjà un compte : connectez-vous.");
  const slug = await identifiantLibre(nomChambre);

  let creee: { chambreId: string; userId: string };
  try {
    creee = await db.$transaction(async (tx) => {
      const c = await tx.chambre.create({ data: { slug, nom: nomChambre, demarrage: "offre" }, select: { id: true } });
      await tx.profilChambre.create({ data: { chambreId: c.id, nom: nomChambre, email, telephone, ville, pays } });
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
    if ((e as { code?: string }).code === "P2002") erreur("Ce nom ou cet e-mail vient d’être pris : réessayez.");
    throw e;
  }
  oublierAdresses();
  await appliquerOffre(creee.chambreId, offreId, fonctions, nom);

  const lien = await entree(creee.chambreId, creee.userId);
  const adresse = await adresseOuSite(creee.chambreId, "equipe");
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

  const valides = comptesDuMotDePasse(await comptesDeLAdresse(email), motDePasse).filter((c) => c.role !== "visiteur");
  if (!valides.length) echec("Adresse ou mot de passe incorrect.");
  await lierComptes(valides.map((c) => c.id));
  const ouverts = comptesOuverts(valides);
  if (ouverts.length > 1) {
    oublier(`connexion:${origine}:${email}`);
    const base = adresseEspace("client");
    if (base) redirect(`${base}/auth/choisir?${new URLSearchParams({ j: scellerChoix(ouverts.map((c) => c.id)) })}`);
  }
  const u = ouverts[0] ?? valides[0];
  if (u.member?.statut === "candidature") echec("Votre demande d’adhésion est en cours d’examen.");
  if (u.member?.statut === "refusee") echec("Votre demande d’adhésion n’a pas été retenue.");

  oublier(`connexion:${origine}:${email}`);
  const lien = await entree(u.chambreId, u.id);
  if (!lien) echec("Votre espace n’a pas encore d’adresse : écrivez à la plateforme.");
  redirect(lien);
}

const OUBLI = "/mot-de-passe-oublie";

export async function demanderReinitialisationPlateforme(formData: FormData) {
  const email = texte(formData, "email").toLowerCase();
  const vers = (params: Record<string, string>): never => redirect(`${OUBLI}?${new URLSearchParams(params)}`);
  if (!ADRESSE.test(email)) vers({ erreur: "Indiquez une adresse e-mail valide.", email });

  const origine = await origineAppelante();
  const attente = Math.max(tentative(`oubli:${email}`, 3, HEURE), tentative(`oubli:${origine}`, 10, HEURE));
  if (attente) vers({ erreur: `Trop de demandes. Réessayez dans ${minutes(attente)} minute${minutes(attente) > 1 ? "s" : ""}.`, email });

  after(async () => {
    const comptes = await db.user.findMany({ where: { email, role: { not: "visiteur" } }, select: { id: true, nom: true, role: true, chambreId: true } });
    for (const u of comptes) {
      await avecChambre(u.chambreId, async () => {
        const base = await urlPublique("/auth/nouveau-mot-de-passe");
        const jeton = await creerJeton(u.id, "reinitialisation");
        await envoyerCourriel(courrielReinitialisation(email, u.nom, `${base}?jeton=${jeton}`)).catch((e) => console.error("[plateforme] courriel de réinitialisation", e));
      });
    }
  });
  vers({ envoye: email });
}

export async function envoyerContact(formData: FormData) {
  const nom = texte(formData, "nom", 100);
  const email = texte(formData, "email").toLowerCase();
  const message = String(formData.get("message") ?? "").replace(/\r\n/g, "\n").trim().slice(0, 3000);
  const vers = (params: Record<string, string>): never => redirect(`/contact?${new URLSearchParams(params)}`);
  const saisies = { nom, email, message: message.slice(0, 1000) };
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
