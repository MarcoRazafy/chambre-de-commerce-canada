"use server";

import { revalidatePath } from "next/cache";
import { exigerAdministrateur } from "@/lib/autorisations";
import { declarerDomaine, oublierDomaine, verifierDomaine } from "@/lib/brevo-domaines";
import { courrielsActifs, envoyerCourriel, gabarit, oublierExpediteur } from "@/lib/courriel";
import { prisma } from "@/lib/db";
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
