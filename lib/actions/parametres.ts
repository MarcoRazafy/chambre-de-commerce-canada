"use server";

import { revalidatePath } from "next/cache";
import { exigerAdministrateur } from "@/lib/autorisations";
import {
  adresseValidee,
  assurerExpediteur,
  declarerDomaine,
  domaineDe,
  domaineValide,
  estWebmail,
  normaliserDomaine,
  oublierDomaine,
  verifierDomaine,
} from "@/lib/brevo-domaines";
import { adresseServeur, courrielsActifs, envoyerCourriel, gabarit, oublierExpediteur } from "@/lib/courriel";
import { prisma } from "@/lib/db";
import { RESEAUX, urlSure } from "@/lib/lettre-blocs";
import { redirectWithErreur, redirectWithFlash } from "@/lib/flash";

// Paramètres (super admins) : l'expéditeur des courriels. D'abord le domaine de l'entreprise (validé chez Brevo),
// ensuite le nom et l'adresse d'expédition sur ce domaine ; un envoi de test.
const PAGE = "/admin/parametres";
const texte = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max);
const adresseValide = (e: string) => /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(e);
const PARTIE_LOCALE = /^[a-z0-9](?:[a-z0-9._+-]{0,62}[a-z0-9])?$/;
const nomSaisi = (fd: FormData) => texte(fd, "expediteurNom", 100).replace(/["<>]/g, "");

// Enregistre le nom et l'adresse (partie avant le @, sur le domaine enregistré), sans rediriger sauf erreur de saisie
async function sauverExpediteur(formData: FormData) {
  const moi = await exigerAdministrateur(PAGE);
  const actuel = await prisma.profilChambre.findUnique({ where: { id: "unique" }, select: { nom: true, expediteurDomaine: true } });
  const domaine = actuel?.expediteurDomaine ?? "";
  const expediteurNom = nomSaisi(formData);
  let locale = texte(formData, "expediteurLocale", 254).toLowerCase();
  if (locale.includes("@")) {
    if (normaliserDomaine(locale) !== domaine) redirectWithErreur(PAGE, `L’adresse doit finir par @${domaine}.`);
    locale = locale.slice(0, locale.indexOf("@"));
  }
  if (locale && !PARTIE_LOCALE.test(locale)) redirectWithErreur(PAGE, `« ${locale} » n’est pas valide avant le @.`);
  const expediteurEmail = domaine && locale ? `${locale}@${domaine}` : "";
  await prisma.profilChambre.upsert({
    where: { id: "unique" },
    create: { id: "unique", expediteurNom, expediteurEmail },
    update: { expediteurNom, expediteurEmail },
  });
  oublierExpediteur();
  revalidatePath(PAGE);
  return { moi, domaine, email: expediteurEmail, nom: expediteurNom || actuel?.nom || "" };
}

// L'adresse, sur un domaine validé, existe comme expéditeur chez Brevo
async function preparerExpediteur(email: string, nom: string) {
  if (email && (await adresseValidee(email))) await assurerExpediteur(email, nom);
}

export async function enregistrerExpediteur(formData: FormData) {
  // Entrée dans le champ du domaine : c'est « Ajouter »
  if (texte(formData, "expediteurDomaine")) return ajouterDomaineExpediteur(formData);
  const { email, nom } = await sauverExpediteur(formData);
  await preparerExpediteur(email, nom);
  redirectWithFlash(PAGE, "Expéditeur enregistré");
}

// « Ajouter » : le domaine de l'entreprise est enregistré et déclaré à Brevo (enregistrements DNS à copier)
export async function ajouterDomaineExpediteur(formData: FormData) {
  await sauverExpediteur(formData);
  const domaine = normaliserDomaine(texte(formData, "expediteurDomaine", 300));
  if (!domaine) redirectWithErreur(PAGE, "Indiquez votre nom de domaine.");
  if (!domaineValide(domaine)) redirectWithErreur(PAGE, `« ${domaine} » n’est pas un nom de domaine valide.`);
  if (estWebmail(domaine)) redirectWithErreur(PAGE, `${domaine} est une messagerie gratuite : indiquez le domaine de votre entreprise.`);
  if (domaine === domaineDe(adresseServeur())) redirectWithErreur(PAGE, `${domaine} est déjà le domaine actif.`);
  await prisma.profilChambre.update({ where: { id: "unique" }, data: { expediteurDomaine: domaine, expediteurEmail: "" } });
  oublierDomaine(domaine);
  oublierExpediteur();
  revalidatePath(PAGE);
  const etat = await declarerDomaine(domaine);
  if (etat.etat === "indisponible") redirectWithErreur(PAGE, `Domaine ajouté, mais Brevo n’a pas pu être joint : ${etat.raison}.`);
  redirectWithFlash(PAGE, etat.etat === "valide" ? "Domaine ajouté et déjà validé" : "Domaine ajouté");
}

// « Retirer » : on revient au domaine de la plateforme
export async function retirerDomaineExpediteur(formData: FormData) {
  await exigerAdministrateur(PAGE);
  await prisma.profilChambre.upsert({
    where: { id: "unique" },
    create: { id: "unique", expediteurNom: nomSaisi(formData) },
    update: { expediteurNom: nomSaisi(formData), expediteurDomaine: "", expediteurEmail: "" },
  });
  oublierExpediteur();
  revalidatePath(PAGE);
  redirectWithFlash(PAGE, "Domaine retiré");
}

// « Valider ce domaine » (domaine inconnu de Brevo) : il est déclaré de nouveau
export async function validerDomaineExpediteur(formData: FormData) {
  const { domaine } = await sauverExpediteur(formData);
  if (!domaine) redirectWithErreur(PAGE, "Ajoutez d’abord votre nom de domaine.");
  const etat = await declarerDomaine(domaine);
  if (etat.etat === "indisponible") redirectWithErreur(PAGE, `Brevo n’a pas pu être joint : ${etat.raison}.`);
  redirectWithFlash(PAGE, etat.etat === "valide" ? "Ce domaine est déjà validé" : "Domaine déclaré");
}

// « Vérifier maintenant » : Brevo contrôle les enregistrements DNS ; validé, l'adresse devient un expéditeur
export async function verifierDomaineExpediteur(formData: FormData) {
  const { domaine, email, nom } = await sauverExpediteur(formData);
  if (!domaine) redirectWithErreur(PAGE, "Ajoutez d’abord votre nom de domaine.");
  const etat = await verifierDomaine(domaine);
  oublierExpediteur();
  if (etat.etat === "valide") {
    if (email) await assurerExpediteur(email, nom);
    redirectWithFlash(PAGE, email ? `Domaine validé : les courriels partent de ${email}` : "Domaine validé : indiquez l’adresse d’expédition");
  }
  if (etat.etat === "indisponible") redirectWithErreur(PAGE, `Brevo n’a pas pu être joint : ${etat.raison}.`);
  const manquants = etat.etat === "en_attente" ? etat.enregistrements.filter((x) => !x.ok).length : 0;
  redirectWithErreur(
    PAGE,
    manquants
      ? `Pas encore validé : ${manquants} enregistrement${manquants > 1 ? "s" : ""} DNS introuvable${manquants > 1 ? "s" : ""}. Ils peuvent mettre jusqu’à 24 h à apparaître.`
      : "Pas encore validé. Réessayez dans quelques minutes.",
  );
}

// « M'envoyer un test » : un courriel à la personne connectée, avec l'expéditeur enregistré
export async function envoyerTestExpediteur(formData: FormData) {
  const { moi, email, nom } = await sauverExpediteur(formData);
  if (!courrielsActifs()) redirectWithErreur(PAGE, "L’envoi de courriels n’est pas configuré sur le serveur.");
  await preparerExpediteur(email, nom);
  const { html, texte: brut } = gabarit({
    titre: "Courriel de test",
    paragraphes: [
      `Bonjour ${moi.nom.split(/\s+/)[0] ?? ""},`,
      "Ce courriel vérifie l’expéditeur des courriels de la plateforme. Regardez le nom et l’adresse affichés, puis répondez pour voir où arrivent les réponses.",
    ],
  });
  const ok = await envoyerCourriel({ a: moi.email, sujet: "Test de l’expéditeur des courriels", html, texte: brut });
  if (!ok) redirectWithErreur(PAGE, "Le test n’a pas pu partir. Réessayez dans un instant.");
  redirectWithFlash(PAGE, `Test envoyé à ${moi.email}`);
}

// Enregistre quelques champs de la fiche (Paramètres), réservé aux super admins
async function enregistrerChamps(onglet: string, data: Record<string, string>, message: string): Promise<never> {
  await exigerAdministrateur(`${PAGE}?onglet=${onglet}`);
  await prisma.profilChambre.upsert({ where: { id: "unique" }, create: { id: "unique", ...data }, update: data });
  revalidatePath("/", "layout");
  redirectWithFlash(`${PAGE}?onglet=${onglet}`, message);
}

// Onglet Courriels : l'adresse qui reçoit les alertes de l'équipe
export async function enregistrerAlertes(formData: FormData) {
  const courrielEquipe = texte(formData, "courrielEquipe").toLowerCase();
  if (courrielEquipe && !adresseValide(courrielEquipe)) redirectWithErreur(PAGE, `« ${courrielEquipe} » n’est pas une adresse e-mail valide.`);
  await enregistrerChamps("courriels", { courrielEquipe }, "Adresse des alertes enregistrée");
}

// Onglet Réseaux sociaux : une adresse par réseau (vide : pas d'icône)
export async function enregistrerReseaux(formData: FormData) {
  const data: Record<string, string> = {};
  for (const r of RESEAUX) {
    const saisie = texte(formData, r, 500);
    const url = saisie ? urlSure(saisie) : "";
    if (saisie && !url) redirectWithErreur(`${PAGE}?onglet=reseaux`, `L’adresse ${r} n’est pas une adresse web valide.`);
    data[r] = url;
  }
  await enregistrerChamps("reseaux", data, "Réseaux sociaux enregistrés");
}

// Onglet Mentions légales : politique de confidentialité et copyright du bas des courriels
export async function enregistrerMentions(formData: FormData) {
  const saisie = texte(formData, "confidentialite", 500);
  const confidentialite = saisie ? urlSure(saisie) : "";
  if (saisie && !confidentialite) redirectWithErreur(`${PAGE}?onglet=mentions`, "Le lien de la politique de confidentialité n’est pas une adresse web valide.");
  await enregistrerChamps("mentions", { confidentialite, copyright: texte(formData, "copyright", 300) }, "Mentions légales enregistrées");
}
