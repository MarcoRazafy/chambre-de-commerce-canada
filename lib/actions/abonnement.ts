"use server";

// Abonnement de la Chambre à la plateforme (super admins) : la carte, le paiement d'une facture, le passage
// à l'offre Payante. Le paiement se fait sur la page de Stripe ; le retour revient à l'abonnement.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { noter, passerALOffre, sessionCarte, sessionPaiement } from "@/lib/abonnement-stripe";
import { exigerAdministrateur } from "@/lib/autorisations";
import { chambreCourante, oublierAdresses } from "@/lib/chambre-courante";
import { urlPublique } from "@/lib/courriel";
import { prisma, prismaSysteme } from "@/lib/db";
import { estFonction, libellesFonctions } from "@/lib/fonctions-plateforme";
import { forfaitOffre, offreGratuite } from "@/lib/plateforme";
import { redirectWithErreur, redirectWithFlash } from "@/lib/flash";
import { stripeConfigure } from "@/lib/stripe";

const PAGE = "/admin/abonnement";
const FACTURES = `${PAGE}?onglet=factures`;
const INDISPONIBLE = "Le paiement par carte n’est pas encore disponible.";

async function pret(retour: string) {
  const moi = await exigerAdministrateur(retour);
  if (!stripeConfigure()) redirectWithErreur(retour, INDISPONIBLE);
  return { moi, chambreId: await chambreCourante(), retour: await urlPublique(retour) };
}

// Ajouter ou changer la carte
export async function enregistrerCarteAbonnement() {
  const { chambreId, retour } = await pret(FACTURES);
  redirect(await sessionCarte(chambreId, retour));
}

// Payer une facture en ligne
export async function payerFactureAbonnement(formData: FormData) {
  const { chambreId, retour } = await pret(FACTURES);
  const url = await sessionPaiement(chambreId, String(formData.get("factureId") ?? ""), retour);
  if (!url) redirectWithErreur(FACTURES, "Cette facture est introuvable ou déjà payée.");
  redirect(url);
}

// Passer à l'offre Payante : tout de suite si une carte est enregistrée, sinon après l'avoir enregistrée
export async function passerAOffrePayante() {
  const moi = await exigerAdministrateur(PAGE);
  const chambreId = await chambreCourante();
  const c = await prisma.chambre.findFirst({ select: { stripeCarteId: true } });
  if (c?.stripeCarteId) {
    await passerALOffre(chambreId, "payante", moi.nom);
    redirectWithFlash(PAGE, "Offre Payante");
  }
  if (!stripeConfigure()) redirectWithErreur(PAGE, INDISPONIBLE);
  redirect(await sessionCarte(chambreId, await urlPublique(PAGE), "payante"));
}

// Offre à la carte : choisir ses fonctions. Déjà sur cette offre : le choix s'applique tout de suite ; depuis une
// autre offre : passage à l'offre à la carte, après l'enregistrement de la carte si elle est payante
export async function composerOffre(formData: FormData) {
  const moi = await exigerAdministrateur(PAGE);
  const chambreId = await chambreCourante();
  const offre = await prisma.offre.findFirst({ where: { surMesure: true }, orderBy: { ordre: "asc" } });
  if (!offre) redirectWithErreur(PAGE, "L’offre sur mesure n’est pas disponible.");
  const choisies = [...new Set(formData.getAll("fonctions").map(String).filter(estFonction))].filter((f) => offre.fonctions.includes(f));
  const c = await prisma.chambre.findFirst({ select: { offreId: true, stripeCarteId: true } });
  await prismaSysteme.chambre.update({ where: { id: chambreId }, data: { fonctionsChoisies: choisies } });
  oublierAdresses();
  revalidatePath("/", "layout");

  if (c?.offreId === offre.id) {
    await noter(chambreId, "fonctions_choisies", `Fonctions : ${libellesFonctions(choisies) || "aucune"}.`, moi.nom);
    redirectWithFlash(PAGE, "Fonctions enregistrées");
  }
  const payante = !offreGratuite({ forfait: forfaitOffre(offre, choisies), parUtilisateur: offre.parUtilisateur });
  if (!payante || c?.stripeCarteId) {
    await passerALOffre(chambreId, offre.id, moi.nom);
    redirectWithFlash(PAGE, `Offre ${offre.nom}`);
  }
  if (!stripeConfigure()) redirectWithErreur(PAGE, INDISPONIBLE);
  redirect(await sessionCarte(chambreId, await urlPublique(PAGE), offre.id));
}
