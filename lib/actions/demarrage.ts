"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { noter, sessionPaiement } from "@/lib/abonnement-stripe";
import { alerterGM } from "@/lib/alertes-gm";
import { exigerAdministrateur } from "@/lib/autorisations";
import { chambreCourante, oublierAdresses } from "@/lib/chambre-courante";
import { oublierExpediteur, urlPublique } from "@/lib/courriel";
import { prisma, prismaSysteme as db } from "@/lib/db";
import { factureDeDemarrage } from "@/lib/factures-plateforme";
import { redirectWithErreur, redirectWithFlash } from "@/lib/flash";
import { libellesFonctions } from "@/lib/fonctions-plateforme";
import { appliquerOffre } from "@/lib/demarrage";
import { adresseSurUneLigne } from "@/lib/profil-chambre-defauts";
import { stripeConfigure } from "@/lib/stripe";
import { enregistrerImage, ImageRefusee } from "@/lib/uploads";

const PAGE = "/demarrage";
const texte = (fd: FormData, k: string, max = 300) => String(fd.get(k) ?? "").trim().slice(0, max);

async function etapeEnCours() {
  const moi = await exigerAdministrateur(PAGE);
  const chambreId = await chambreCourante();
  const c = await db.chambre.findUnique({ where: { id: chambreId }, select: { demarrage: true } });
  if (!c?.demarrage) redirect("/admin");
  return { moi, chambreId, etape: c.demarrage };
}

export async function choisirOffreDemarrage(formData: FormData) {
  const { moi, chambreId, etape } = await etapeEnCours();
  if (etape !== "offre") redirect(PAGE);
  const fonctions = formData.getAll("fonctions").map(String);
  if (!(await appliquerOffre(chambreId, texte(formData, "offre", 50), fonctions, moi.nom))) redirectWithErreur(PAGE, "Choisissez une offre.");
  redirect(PAGE);
}

export async function revenirAuxOffres() {
  const { chambreId, etape } = await etapeEnCours();
  if (etape === "paiement") {
    await db.facturePlateforme.deleteMany({ where: { chambreId, payeeLe: null } });
    await db.chambre.update({ where: { id: chambreId }, data: { demarrage: "offre" } });
  }
  redirect(PAGE);
}

export async function payerDemarrage() {
  const { chambreId, etape } = await etapeEnCours();
  if (etape !== "paiement") redirect(PAGE);
  if (!stripeConfigure()) redirectWithErreur(PAGE, "Le paiement par carte n’est pas encore disponible.");
  const f = await factureDeDemarrage();
  const url = f ? await sessionPaiement(chambreId, f.id, await urlPublique(PAGE)) : null;
  if (!url) redirectWithErreur(PAGE, "Cette facture est introuvable ou déjà payée.");
  redirect(url);
}

export async function payerPlusTard() {
  const { moi, chambreId, etape } = await etapeEnCours();
  if (etape !== "paiement") redirect(PAGE);
  if (!(await factureDeDemarrage())) redirect(PAGE);
  await db.chambre.update({ where: { id: chambreId }, data: { demarrage: "infos", paiementDiffere: true } });
  await noter(chambreId, "paiement_differe", "Paiement du premier mois remis à plus tard.", moi.nom);
  oublierAdresses();
  redirect(PAGE);
}

export async function terminerDemarrage(formData: FormData) {
  const { moi, chambreId, etape } = await etapeEnCours();
  if (etape !== "infos") redirect(PAGE);

  if (texte(formData, "plusTard") !== "1") {
    let logo: string | null = null;
    try {
      logo = await enregistrerImage(formData.get("logo"), { prefixe: "chambre-logo", largeur: 600, transparence: true });
    } catch (e) {
      if (e instanceof ImageRefusee) redirectWithErreur(PAGE, e.message);
      throw e;
    }
    const adresse = {
      adresseRue: texte(formData, "adresseRue", 300),
      codePostal: texte(formData, "codePostal", 20),
      ville: texte(formData, "ville", 120),
      pays: texte(formData, "pays", 120),
    };
    const data = {
      ...adresse,
      adresse: adresseSurUneLigne(adresse),
      description: texte(formData, "description", 3000),
      telephone: texte(formData, "telephone", 60),
      site: texte(formData, "site", 300),
      raisonSociale: texte(formData, "raisonSociale", 200),
      neq: texte(formData, "neq", 40),
      tps: texte(formData, "tps", 40),
      tvq: texte(formData, "tvq", 40),
      ...(logo ? { logo } : {}),
    };
    await prisma.profilChambre.upsert({ where: { chambreId }, create: data, update: data });
    oublierExpediteur();
  }

  await db.chambre.update({ where: { id: chambreId }, data: { demarrage: null } });
  await noter(chambreId, "demarrage_termine", "Démarrage terminé.", moi.nom);
  oublierAdresses();
  revalidatePath("/", "layout");
  after(async () => {
    const c = await db.chambre.findUnique({ where: { id: chambreId }, select: { nom: true, fonctionsChoisies: true, offre: { select: { nom: true, surMesure: true } } } });
    if (!c) return;
    await alerterGM({
      sujet: `Démarrage terminé : ${c.nom}`,
      titre: "Démarrage terminé",
      paragraphes: [`${c.nom} a terminé son démarrage avec l’offre ${c.offre.nom}${c.offre.surMesure ? ` (${libellesFonctions(c.fonctionsChoisies) || "aucune fonction"})` : ""}.`],
      chambreId,
    });
  });
  redirectWithFlash("/admin", "Votre espace est prêt");
}
