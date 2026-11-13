"use server";

// Démarrage d'une Chambre créée depuis le site (super admin) : choix de l'offre, paiement du premier mois sur la
// page de Stripe (offre payante), informations de la Chambre. Chaque étape mène à la suivante (/demarrage).
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
import { estFonction, libellesFonctions } from "@/lib/fonctions-plateforme";
import { forfaitOffre, offreGratuite } from "@/lib/plateforme";
import { adresseSurUneLigne } from "@/lib/profil-chambre-defauts";
import { stripeConfigure } from "@/lib/stripe";
import { enregistrerImage, ImageRefusee } from "@/lib/uploads";

const PAGE = "/demarrage";
const texte = (fd: FormData, k: string, max = 300) => String(fd.get(k) ?? "").trim().slice(0, max);

// Le super admin, la Chambre et son étape ; démarrage fini : son espace
async function etapeEnCours() {
  const moi = await exigerAdministrateur(PAGE);
  const chambreId = await chambreCourante();
  const c = await db.chambre.findUnique({ where: { id: chambreId }, select: { demarrage: true } });
  if (!c?.demarrage) redirect("/admin");
  return { moi, chambreId, etape: c.demarrage };
}

// 1. L'offre : gratuite, on passe aux informations ; payante, au paiement du premier mois
export async function choisirOffreDemarrage(formData: FormData) {
  const { moi, chambreId, etape } = await etapeEnCours();
  if (etape !== "offre") redirect(PAGE);
  const offre = await db.offre.findUnique({ where: { id: texte(formData, "offre", 50) } });
  if (!offre) redirectWithErreur(PAGE, "Choisissez une offre.");
  const choisies = offre.surMesure
    ? [...new Set(formData.getAll("fonctions").map(String).filter(estFonction))].filter((f) => offre.fonctions.includes(f))
    : [];
  const payante = !offreGratuite({ forfait: forfaitOffre(offre, choisies), parUtilisateur: offre.parUtilisateur });

  // Une facture impayée d'un choix précédent ne compte plus
  await db.facturePlateforme.deleteMany({ where: { chambreId, payeeLe: null } });
  await db.chambre.update({
    where: { id: chambreId },
    data: { offreId: offre.id, fonctionsChoisies: choisies, demarrage: payante ? "paiement" : "infos" },
  });
  await noter(chambreId, "offre_choisie", `Offre ${offre.nom}.${offre.surMesure ? ` Fonctions : ${libellesFonctions(choisies) || "aucune"}.` : ""}`, moi.nom);
  oublierAdresses();
  if (payante) await factureDeDemarrage();
  redirect(PAGE);
}

// Revenir au choix de l'offre (avant le paiement)
export async function revenirAuxOffres() {
  const { chambreId, etape } = await etapeEnCours();
  if (etape === "paiement") {
    await db.facturePlateforme.deleteMany({ where: { chambreId, payeeLe: null } });
    await db.chambre.update({ where: { id: chambreId }, data: { demarrage: "offre" } });
  }
  redirect(PAGE);
}

// 2. Le paiement du premier mois, sur la page de Stripe (la carte est gardée pour les mois suivants)
export async function payerDemarrage() {
  const { chambreId, etape } = await etapeEnCours();
  if (etape !== "paiement") redirect(PAGE);
  if (!stripeConfigure()) redirectWithErreur(PAGE, "Le paiement par carte n’est pas encore disponible.");
  const f = await factureDeDemarrage();
  const url = f ? await sessionPaiement(chambreId, f.id, await urlPublique(PAGE)) : null;
  if (!url) redirectWithErreur(PAGE, "Cette facture est introuvable ou déjà payée.");
  redirect(url);
}

// 3. Les informations de la Chambre (logo, coordonnées, présentation, facturation), puis son espace.
// « Plus tard » : rien n'est enregistré, tout se règle ensuite dans Mon entreprise.
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
