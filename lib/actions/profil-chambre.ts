"use server";

import { revalidatePath } from "next/cache";
import { exigerEquipe } from "@/lib/autorisations";
import { prisma } from "@/lib/db";
import { redirectWithErreur, redirectWithFlash } from "@/lib/flash";
import { declarerDomaine, oublierDomaine, verifierDomaine } from "@/lib/brevo-domaines";
import { oublierExpediteur } from "@/lib/courriel";
import { adresseSurUneLigne } from "@/lib/profil-chambre-defauts";
import { enregistrerImage, ImageRefusee } from "@/lib/uploads";

const PAGE = "/admin/entreprise";
const texte = (fd: FormData, k: string, max = 300) => String(fd.get(k) ?? "").trim().slice(0, max);

// Une image du profil : la nouvelle si elle est envoyée, rien si elle est retirée, sinon l'actuelle
async function image(fd: FormData, champ: string, actuelle: string | null | undefined, options: { largeur: number; transparence?: boolean }) {
  if (texte(fd, `retirer-${champ}`) === "1") return null;
  const nouvelle = await enregistrerImage(fd.get(champ), { prefixe: `chambre-${champ}`, ...options });
  return nouvelle ?? actuelle ?? null;
}

// Enregistre toute la fiche « Mon entreprise » (sans rediriger, sauf erreur de saisie) ; renvoie l'expéditeur
async function sauverProfil(formData: FormData) {
  await exigerEquipe();
  const actuel = await prisma.profilChambre.findUnique({ where: { id: "unique" } });
  let logo: string | null, couverture: string | null;
  try {
    logo = await image(formData, "logo", actuel?.logo, { largeur: 600, transparence: true });
    couverture = await image(formData, "couverture", actuel?.couverture, { largeur: 1600 });
  } catch (e) {
    if (e instanceof ImageRefusee) redirectWithErreur(PAGE, e.message);
    throw e;
  }

  const email = texte(formData, "email", 200);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirectWithErreur(PAGE, `« ${email} » n’est pas une adresse e-mail valide.`);
  const expediteurEmail = texte(formData, "expediteurEmail", 200);
  if (expediteurEmail && !/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(expediteurEmail)) redirectWithErreur(PAGE, `« ${expediteurEmail} » n’est pas une adresse e-mail valide.`);

  const data = {
    nom: texte(formData, "nom", 200),
    description: texte(formData, "description", 3000),
    adresseRue: texte(formData, "adresseRue", 300),
    codePostal: texte(formData, "codePostal", 20),
    ville: texte(formData, "ville", 120),
    pays: texte(formData, "pays", 120),
    adresse: adresseSurUneLigne({
      adresseRue: texte(formData, "adresseRue", 300),
      codePostal: texte(formData, "codePostal", 20),
      ville: texte(formData, "ville", 120),
      pays: texte(formData, "pays", 120),
    }),
    telephone: texte(formData, "telephone", 60),
    email,
    site: texte(formData, "site", 300),
    logo,
    couverture,
    raisonSociale: texte(formData, "raisonSociale", 200),
    neq: texte(formData, "neq", 40),
    tps: texte(formData, "tps", 40),
    tvq: texte(formData, "tvq", 40),
    expediteurNom: texte(formData, "expediteurNom", 100).replace(/["<>]/g, ""),
    expediteurEmail,
  };
  await prisma.profilChambre.upsert({ where: { id: "unique" }, create: { id: "unique", ...data }, update: data });
  if (expediteurEmail) oublierDomaine(expediteurEmail);
  oublierExpediteur();
  revalidatePath("/", "layout");
  return { email: expediteurEmail, nom: data.expediteurNom || data.nom };
}

// « Mon entreprise » : la présentation de la Chambre et ce qui figure sur ses factures
export async function enregistrerProfilChambre(formData: FormData) {
  await sauverProfil(formData);
  redirectWithFlash(PAGE, "Mon entreprise est à jour");
}

// « Valider ce domaine » : la fiche est enregistrée, puis le domaine de l'adresse d'expédition est déclaré à Brevo
export async function validerDomaineExpediteur(formData: FormData) {
  const { email } = await sauverProfil(formData);
  if (!email) redirectWithErreur(PAGE, "Indiquez d’abord l’adresse d’expédition.");
  const etat = await declarerDomaine(email);
  if (etat.etat === "indisponible") redirectWithErreur(PAGE, `Brevo n’a pas pu être joint : ${etat.raison}.`);
  redirectWithFlash(
    PAGE,
    etat.etat === "valide" ? "Ce domaine est déjà validé" : "Domaine déclaré : ajoutez les enregistrements DNS ci-dessous, puis vérifiez",
  );
}

// « Vérifier maintenant » : Brevo contrôle les enregistrements DNS ; validé, l'expéditeur est créé
export async function verifierDomaineExpediteur(formData: FormData) {
  const { email, nom } = await sauverProfil(formData);
  if (!email) redirectWithErreur(PAGE, "Indiquez d’abord l’adresse d’expédition.");
  const etat = await verifierDomaine(email, nom);
  oublierExpediteur();
  if (etat.etat === "valide") redirectWithFlash(PAGE, `Domaine validé : les courriels partent de ${email}`);
  if (etat.etat === "indisponible") redirectWithErreur(PAGE, `Brevo n’a pas pu être joint : ${etat.raison}.`);
  const manquants = etat.etat === "en_attente" ? etat.enregistrements.filter((x) => !x.ok).length : 0;
  redirectWithErreur(
    PAGE,
    manquants
      ? `Pas encore validé : ${manquants} enregistrement${manquants > 1 ? "s" : ""} DNS introuvable${manquants > 1 ? "s" : ""}. Ils peuvent mettre jusqu’à 24 h à apparaître.`
      : "Pas encore validé. Réessayez dans quelques minutes.",
  );
}

// Icônes posées sur le logo et la couverture de « Mon entreprise » : change ou retire l'image tout de suite, sans toucher au reste
export async function changerImageChambre(formData: FormData) {
  await exigerEquipe();
  const champ = texte(formData, "champ");
  if (champ !== "logo" && champ !== "couverture") redirectWithErreur(PAGE, "Image inconnue.");
  const actuel = await prisma.profilChambre.findUnique({ where: { id: "unique" }, select: { [champ]: true } });
  let valeur: string | null;
  try {
    valeur = await image(formData, champ, actuel?.[champ] as string | null | undefined, champ === "logo" ? { largeur: 600, transparence: true } : { largeur: 1600 });
  } catch (e) {
    if (e instanceof ImageRefusee) redirectWithErreur(PAGE, e.message);
    throw e;
  }
  await prisma.profilChambre.upsert({ where: { id: "unique" }, create: { id: "unique", [champ]: valeur }, update: { [champ]: valeur } });
  revalidatePath("/", "layout");
  const quoi = champ === "logo" ? "Logo" : "Couverture";
  redirectWithFlash(PAGE, valeur ? `${quoi} mis${champ === "logo" ? "" : "e"} à jour` : `${quoi} retiré${champ === "logo" ? "" : "e"}`);
}
