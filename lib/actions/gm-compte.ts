"use server";

// Compte de l'Admin GM : son nom et son adresse, son mot de passe, et « mot de passe oublié » (lien par courriel)
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { hacher, MOT_DE_PASSE_MIN, verifier } from "@/lib/auth";
import { ouvrirSessionGM } from "@/lib/auth-gm";
import { envoyerCourriel } from "@/lib/courriel";
import { prismaSysteme as db } from "@/lib/db";
import { redirectWithErreur, redirectWithFlash } from "@/lib/flash";
import { exigerGM } from "@/lib/gm";
import { compteGMDuLien, courrielReinitialisationGM, creerLienReinitialisationGM } from "@/lib/gm-compte";
import { minutes, oublier, origineAppelante, tentative } from "@/lib/limite";

const texte = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max);
const ADRESSE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
const COMPTE = "/gm/parametres?onglet=compte";
const OUBLI = "/gm/mot-de-passe-oublie";
const NOUVEAU = "/gm/nouveau-mot-de-passe";
const HEURE = 60 * 60 * 1000;
const delai = (ms: number) => `${minutes(ms)} minute${minutes(ms) > 1 ? "s" : ""}`;

function vers(chemin: string, params: Record<string, string>): never {
  redirect(`${chemin}?${new URLSearchParams(params)}`);
}

// Nom et adresse e-mail du compte connecté
export async function modifierCompteGM(formData: FormData) {
  const gm = await exigerGM();
  const nom = texte(formData, "nom", 100);
  const email = texte(formData, "email").toLowerCase();
  if (!nom) redirectWithErreur(COMPTE, "Indiquez votre nom.");
  if (!ADRESSE.test(email)) redirectWithErreur(COMPTE, "Indiquez une adresse e-mail valide.");
  const autre = await db.compteGM.findUnique({ where: { email }, select: { id: true } });
  if (autre && autre.id !== gm.id) redirectWithErreur(COMPTE, "Cette adresse est déjà celle d’un autre compte.");
  await db.compteGM.update({ where: { id: gm.id }, data: { nom, email } });
  revalidatePath("/gm", "layout");
  redirectWithFlash(COMPTE, "Compte mis à jour");
}

// Nouveau mot de passe, l'actuel à l'appui ; les autres sessions ouvertes se ferment, celle-ci continue
export async function changerMotDePasseGM(formData: FormData) {
  const gm = await exigerGM();
  const actuel = String(formData.get("actuel") ?? "");
  const nouveau = String(formData.get("nouveau") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  const erreur = (message: string): never => redirectWithErreur(COMPTE, message);

  const cle = `gm-changement:${gm.id}`;
  const attente = tentative(cle, 5, 15 * 60 * 1000);
  if (attente) erreur(`Trop d’essais. Réessayez dans ${delai(attente)}.`);
  const compte = await db.compteGM.findUniqueOrThrow({ where: { id: gm.id }, select: { motDePasse: true } });
  if (!verifier(actuel, compte.motDePasse)) erreur("Le mot de passe actuel n’est pas le bon.");
  if (nouveau.length < MOT_DE_PASSE_MIN) erreur(`Le nouveau mot de passe fait au moins ${MOT_DE_PASSE_MIN} caractères.`);
  if (nouveau !== confirmation) erreur("Les deux nouveaux mots de passe ne correspondent pas.");
  if (nouveau === actuel) erreur("Choisissez un mot de passe différent de l’actuel.");

  oublier(cle);
  await db.compteGM.update({
    where: { id: gm.id },
    data: { motDePasse: hacher(nouveau), motDePasseModifieLe: new Date(), jetonReinitialisation: null, jetonExpire: null },
  });
  await ouvrirSessionGM(gm.id);
  redirectWithFlash(COMPTE, "Mot de passe modifié");
}

// Mot de passe oublié : un lien par courriel si l'adresse est celle d'un compte (la réponse ne dit pas si c'est le cas)
export async function demanderReinitialisationGM(formData: FormData) {
  const email = texte(formData, "email").toLowerCase();
  if (!ADRESSE.test(email)) vers(OUBLI, { erreur: "Indiquez une adresse e-mail valide.", email });

  const origine = await origineAppelante();
  const attente = Math.max(tentative(`gm-oubli:${email}`, 3, HEURE), tentative(`gm-oubli:${origine}`, 10, HEURE));
  if (attente) vers(OUBLI, { erreur: `Trop de demandes. Réessayez dans ${delai(attente)}.`, email });

  after(async () => {
    const c = await db.compteGM.findUnique({ where: { email }, select: { id: true, nom: true } });
    if (!c) return;
    const lien = await creerLienReinitialisationGM(c.id);
    await envoyerCourriel(courrielReinitialisationGM(email, c.nom, lien)).catch((e) => console.error("[gm] courriel de réinitialisation", e));
  });
  vers(OUBLI, { envoye: email });
}

// Le nouveau mot de passe, depuis le lien reçu ; le compte est ensuite connecté
export async function definirMotDePasseGM(formData: FormData) {
  const brut = texte(formData, "jeton", 100);
  const motDePasse = String(formData.get("motDePasse") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  const c = await compteGMDuLien(brut);
  if (!c) vers(OUBLI, { erreur: "Ce lien n’est plus valable. Demandez-en un nouveau." });
  if (motDePasse.length < MOT_DE_PASSE_MIN) vers(NOUVEAU, { jeton: brut, erreur: `Le mot de passe fait au moins ${MOT_DE_PASSE_MIN} caractères.` });
  if (motDePasse !== confirmation) vers(NOUVEAU, { jeton: brut, erreur: "Les deux mots de passe ne correspondent pas." });

  await db.compteGM.update({
    where: { id: c.id },
    data: { motDePasse: hacher(motDePasse), motDePasseModifieLe: new Date(), jetonReinitialisation: null, jetonExpire: null },
  });
  await ouvrirSessionGM(c.id);
  redirectWithFlash("/gm", "Mot de passe modifié");
}
