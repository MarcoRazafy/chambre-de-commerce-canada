"use server";

import { revalidatePath } from "next/cache";
import { exigerEquipe } from "@/lib/autorisations";
import { prisma } from "@/lib/db";
import { redirectWithErreur, redirectWithFlash } from "@/lib/flash";
import { enregistrerImage, ImageRefusee } from "@/lib/uploads";

const PAGE = "/admin/entreprise";
const texte = (fd: FormData, k: string, max = 300) => String(fd.get(k) ?? "").trim().slice(0, max);

// Une image du profil : la nouvelle si elle est envoyée, rien si elle est retirée, sinon l'actuelle
async function image(fd: FormData, champ: string, actuelle: string | null | undefined, options: { largeur: number; transparence?: boolean }) {
  if (texte(fd, `retirer-${champ}`) === "1") return null;
  const nouvelle = await enregistrerImage(fd.get(champ), { prefixe: `chambre-${champ}`, ...options });
  return nouvelle ?? actuelle ?? null;
}

// « Mon entreprise » : la présentation de la Chambre et ce qui figure sur ses factures
export async function enregistrerProfilChambre(formData: FormData) {
  await exigerEquipe();
  const actuel = await prisma.profilChambre.findUnique({ where: { id: "unique" } });
  let logo: string | null, couverture: string | null, logoFacture: string | null;
  try {
    logo = await image(formData, "logo", actuel?.logo, { largeur: 600, transparence: true });
    couverture = await image(formData, "couverture", actuel?.couverture, { largeur: 1600 });
    logoFacture = await image(formData, "logoFacture", actuel?.logoFacture, { largeur: 600, transparence: true });
  } catch (e) {
    if (e instanceof ImageRefusee) redirectWithErreur(PAGE, e.message);
    throw e;
  }

  const email = texte(formData, "email", 200);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirectWithErreur(PAGE, `« ${email} » n’est pas une adresse e-mail valide.`);

  const data = {
    nom: texte(formData, "nom", 200),
    description: texte(formData, "description", 3000),
    adresse: texte(formData, "adresse", 500),
    telephone: texte(formData, "telephone", 60),
    email,
    site: texte(formData, "site", 300),
    logo,
    couverture,
    raisonSociale: texte(formData, "raisonSociale", 200),
    adresseFacturation: texte(formData, "adresseFacturation", 500),
    neq: texte(formData, "neq", 40),
    tps: texte(formData, "tps", 40),
    tvq: texte(formData, "tvq", 40),
    nif: texte(formData, "nif", 40),
    stat: texte(formData, "stat", 60),
    logoFacture,
    mentionFacture: texte(formData, "mentionFacture", 1000),
  };
  await prisma.profilChambre.upsert({ where: { id: "unique" }, create: { id: "unique", ...data }, update: data });
  revalidatePath("/", "layout");
  redirectWithFlash(PAGE, "Mon entreprise est à jour");
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
