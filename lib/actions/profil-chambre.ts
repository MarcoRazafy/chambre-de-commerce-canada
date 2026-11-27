"use server";

import { revalidatePath } from "next/cache";
import { exigerEquipe } from "@/lib/autorisations";
import { prisma } from "@/lib/db";
import { redirectWithErreur, redirectWithFlash } from "@/lib/flash";
import { nettoyerPrefixe } from "@/lib/prefixe-numeros-base";
import { fuseauConnu } from "@/lib/fuseau";
import { oublierExpediteur } from "@/lib/courriel";
import { adresseSurUneLigne, couleurValide } from "@/lib/profil-chambre-defauts";
import { enregistrerImage, ImageRefusee } from "@/lib/uploads";
import { chambreCourante } from "@/lib/chambre-courante";
import { urlSure } from "@/lib/lettre-blocs";

const PAGE = "/admin/entreprise";
const texte = (fd: FormData, k: string, max = 300) => String(fd.get(k) ?? "").trim().slice(0, max);

async function image(fd: FormData, champ: string, actuelle: string | null | undefined, options: { largeur: number; transparence?: boolean }) {
  if (texte(fd, `retirer-${champ}`) === "1") return null;
  const nouvelle = await enregistrerImage(fd.get(champ), { prefixe: `chambre-${champ}`, ...options });
  return nouvelle ?? actuelle ?? null;
}

async function sauverProfil(formData: FormData) {
  await exigerEquipe();
  const actuel = await prisma.profilChambre.findFirst();
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
  const lien = (champ: string, libelle: string) => {
    const saisie = texte(formData, champ, 500);
    const url = saisie ? urlSure(saisie) : "";
    if (saisie && !url) redirectWithErreur(PAGE, `Le lien ${libelle} n’est pas une adresse web valide.`);
    return url;
  };
  const cgv = lien("cgv", "des conditions générales de vente");
  const confidentialite = lien("confidentialite", "de la politique de confidentialité");

  const prefixeSaisi = nettoyerPrefixe(texte(formData, "prefixeNumeros", 20));
  if (prefixeSaisi.length === 1) redirectWithErreur(PAGE, "Le préfixe des numéros compte 2 à 5 lettres ou chiffres (ex. « UC »).");

  const data = {
    ...(formData.has("prefixeNumeros") ? { prefixeNumeros: prefixeSaisi } : {}),
    ...(fuseauConnu(texte(formData, "fuseau", 60)) ? { fuseau: texte(formData, "fuseau", 60) } : {}),
    nom: texte(formData, "nom", 200),
    description: texte(formData, "description", 3000),
    adresseRue: texte(formData, "adresseRue", 300),
    codePostal: texte(formData, "codePostal", 20),
    ville: texte(formData, "ville", 120),
    province: texte(formData, "province", 120),
    pays: texte(formData, "pays", 120),
    adresse: adresseSurUneLigne({
      adresseRue: texte(formData, "adresseRue", 300),
      codePostal: texte(formData, "codePostal", 20),
      ville: texte(formData, "ville", 120),
      province: texte(formData, "province", 120),
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
    cgv,
    confidentialite,
    copyright: texte(formData, "copyright", 300),
  };
  await prisma.profilChambre.upsert({ where: { chambreId: await chambreCourante() }, create: { ...data }, update: data });
  oublierExpediteur();
  revalidatePath("/", "layout");
}

export async function enregistrerProfilChambre(formData: FormData) {
  await sauverProfil(formData);
  redirectWithFlash(PAGE, "Mon entreprise est à jour");
}

export async function changerImageChambre(formData: FormData) {
  await exigerEquipe();
  const champ = texte(formData, "champ");
  if (champ !== "logo" && champ !== "couverture") redirectWithErreur(PAGE, "Image inconnue.");
  const actuel = await prisma.profilChambre.findFirst({ select: { [champ]: true } });
  let valeur: string | null;
  try {
    valeur = await image(formData, champ, actuel?.[champ] as string | null | undefined, champ === "logo" ? { largeur: 600, transparence: true } : { largeur: 1600 });
  } catch (e) {
    if (e instanceof ImageRefusee) redirectWithErreur(PAGE, e.message);
    throw e;
  }
  await prisma.profilChambre.upsert({ where: { chambreId: await chambreCourante() }, create: { [champ]: valeur }, update: { [champ]: valeur } });
  revalidatePath("/", "layout");
  const quoi = champ === "logo" ? "Logo" : "Couverture";
  redirectWithFlash(PAGE, valeur ? `${quoi} mis${champ === "logo" ? "" : "e"} à jour` : `${quoi} retiré${champ === "logo" ? "" : "e"}`);
}

export async function changerFondLogo(formData: FormData) {
  await exigerEquipe();
  const saisie = texte(formData, "logoFond");
  const logoFond = couleurValide(saisie);
  if (saisie && !logoFond) redirectWithErreur(PAGE, "Couleur inconnue.");
  await prisma.profilChambre.upsert({ where: { chambreId: await chambreCourante() }, create: { logoFond }, update: { logoFond } });
  revalidatePath("/", "layout");
  redirectWithFlash(PAGE, logoFond ? "Fond du logo mis à jour" : "Fond du logo : blanc");
}
