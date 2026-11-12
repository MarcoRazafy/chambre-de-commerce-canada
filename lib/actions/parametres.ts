"use server";

import { revalidatePath } from "next/cache";
import { exigerAdministrateur } from "@/lib/autorisations";
import { declarerDomaine, oublierDomaine, verifierDomaine } from "@/lib/brevo-domaines";
import { courrielsActifs, envoyerCourriel, gabarit, oublierExpediteur } from "@/lib/courriel";
import { prisma } from "@/lib/db";
import { RESEAUX, urlSure } from "@/lib/lettre-blocs";
import { redirectWithErreur, redirectWithFlash } from "@/lib/flash";

// Paramètres (super admins) : l'expéditeur des courriels, la validation de son domaine chez Brevo, un envoi de test
const PAGE = "/admin/parametres";
const texte = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max);
const adresseValide = (e: string) => /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(e);

// Enregistre le nom et l'adresse d'expédition (sans rediriger, sauf erreur de saisie)
async function sauverExpediteur(formData: FormData) {
  const moi = await exigerAdministrateur(PAGE);
  const expediteurNom = texte(formData, "expediteurNom", 100).replace(/["<>]/g, "");
  const expediteurEmail = texte(formData, "expediteurEmail").toLowerCase();
  if (expediteurEmail && !adresseValide(expediteurEmail)) redirectWithErreur(PAGE, `« ${expediteurEmail} » n’est pas une adresse e-mail valide.`);
  const p = await prisma.profilChambre.upsert({
    where: { id: "unique" },
    create: { id: "unique", expediteurNom, expediteurEmail },
    update: { expediteurNom, expediteurEmail },
    select: { nom: true },
  });
  if (expediteurEmail) oublierDomaine(expediteurEmail);
  oublierExpediteur();
  revalidatePath(PAGE);
  return { moi, email: expediteurEmail, nom: expediteurNom || p.nom };
}

export async function enregistrerExpediteur(formData: FormData) {
  await sauverExpediteur(formData);
  redirectWithFlash(PAGE, "Expéditeur enregistré");
}

// « Valider ce domaine » : le domaine de l'adresse d'expédition est déclaré à Brevo
export async function validerDomaineExpediteur(formData: FormData) {
  const { email } = await sauverExpediteur(formData);
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
  const { email, nom } = await sauverExpediteur(formData);
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

// « M'envoyer un test » : un courriel à la personne connectée, avec l'expéditeur enregistré
export async function envoyerTestExpediteur(formData: FormData) {
  const { moi } = await sauverExpediteur(formData);
  if (!courrielsActifs()) redirectWithErreur(PAGE, "L’envoi de courriels n’est pas configuré sur le serveur.");
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
