"use server";

// Espace Admin GM : connexion, offre et accès des Chambres, leur adresse, les offres de la plateforme.
// Hors de toute Chambre : écritures sans limite de Chambre (prismaSysteme), notées dans l'historique de la Chambre.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oublierAdressesChambres } from "@/lib/adresse-chambre";
import { fermerSessionGM, ouvrirSessionGM } from "@/lib/auth-gm";
import { verifier } from "@/lib/auth";
import { domaineValide, normaliserDomaine } from "@/lib/brevo-domaines";
import { oublierAdresses } from "@/lib/chambre-courante";
import { prismaSysteme as db } from "@/lib/db";
import { redirectWithErreur, redirectWithFlash } from "@/lib/flash";
import { estFonction } from "@/lib/fonctions-plateforme";
import { exigerGM } from "@/lib/gm";
import { slugValide } from "@/lib/hote-chambre";
import { minutes, oublier, origineAppelante, tentative } from "@/lib/limite";

const texte = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max);
const fiche = (id: string) => `/gm/chambres/${encodeURIComponent(id)}`;

async function noter(chambreId: string, acteur: string, action: string, detail: string) {
  await db.auditLog.create({ data: { chambreId, action, entite: "Chambre", entiteId: chambreId, acteur: `${acteur} (Admin GM)`, detail } });
}

async function chambreOuErreur(fd: FormData) {
  const id = texte(fd, "chambreId", 100);
  const c = id ? await db.chambre.findUnique({ where: { id }, select: { id: true, nom: true, slug: true, domaine: true, statut: true, offreId: true } }) : null;
  if (!c) redirectWithErreur("/gm/chambres", "Chambre introuvable.");
  return c;
}

// --- Connexion ---

const ESSAIS_PAR_COMPTE = 6;
const ESSAIS_PAR_ORIGINE = 20;
const FENETRE = 15 * 60 * 1000;

function echecConnexion(message: string, email: string, suite: string): never {
  const q = new URLSearchParams({ erreur: message });
  if (email) q.set("email", email);
  if (suite.startsWith("/gm")) q.set("suite", suite);
  redirect(`/gm/connexion?${q}`);
}

export async function connexionGM(formData: FormData) {
  const email = texte(formData, "email").toLowerCase();
  const motDePasse = String(formData.get("motDePasse") ?? "");
  const suite = texte(formData, "suite", 300);
  if (!email || !motDePasse) echecConnexion("Indiquez votre adresse et votre mot de passe.", email, suite);

  const origine = await origineAppelante();
  const attente = Math.max(
    tentative(`gm:${origine}:${email}`, ESSAIS_PAR_COMPTE, FENETRE),
    tentative(`gm:${origine}`, ESSAIS_PAR_ORIGINE, FENETRE),
  );
  if (attente) echecConnexion(`Trop de tentatives. Réessayez dans ${minutes(attente)} minute${minutes(attente) > 1 ? "s" : ""}.`, email, suite);

  const compte = await db.compteGM.findUnique({ where: { email }, select: { id: true, motDePasse: true } });
  if (!compte || !verifier(motDePasse, compte.motDePasse)) echecConnexion("Adresse ou mot de passe incorrect.", email, suite);

  oublier(`gm:${origine}:${email}`);
  await ouvrirSessionGM(compte.id);
  redirect(suite.startsWith("/gm/") && !suite.startsWith("/gm/connexion") ? suite : "/gm/chambres");
}

export async function deconnexionGM() {
  await fermerSessionGM();
  redirect("/gm/connexion");
}

// --- Chambres ---

export async function changerOffreChambre(formData: FormData) {
  const gm = await exigerGM();
  const c = await chambreOuErreur(formData);
  const offre = await db.offre.findUnique({ where: { id: texte(formData, "offreId", 50) }, select: { id: true, nom: true } });
  if (!offre) redirectWithErreur(fiche(c.id), "Offre inconnue.");
  if (offre.id === c.offreId) redirectWithFlash(fiche(c.id), "Offre inchangée");
  await db.chambre.update({ where: { id: c.id }, data: { offreId: offre.id } });
  await noter(c.id, gm.nom, "offre_changee", `Offre ${offre.nom}.`);
  revalidatePath("/gm", "layout");
  redirectWithFlash(fiche(c.id), `Offre ${offre.nom}`);
}

export async function suspendreChambre(formData: FormData) {
  const gm = await exigerGM();
  const c = await chambreOuErreur(formData);
  if (c.statut === "suspendue") redirectWithFlash(fiche(c.id), "Espace déjà suspendu");
  await db.chambre.update({ where: { id: c.id }, data: { statut: "suspendue", suspendueLe: new Date() } });
  await noter(c.id, gm.nom, "espace_suspendu", "Espace suspendu.");
  oublierAdresses();
  revalidatePath("/gm", "layout");
  redirectWithFlash(fiche(c.id), "Espace suspendu");
}

export async function reactiverChambre(formData: FormData) {
  const gm = await exigerGM();
  const c = await chambreOuErreur(formData);
  if (c.statut === "active") redirectWithFlash(fiche(c.id), "Espace déjà actif");
  await db.chambre.update({ where: { id: c.id }, data: { statut: "active", suspendueLe: null } });
  await noter(c.id, gm.nom, "espace_reactive", "Espace réactivé.");
  oublierAdresses();
  revalidatePath("/gm", "layout");
  redirectWithFlash(fiche(c.id), "Espace réactivé");
}

// Adresse : le sous-domaine (« slug ») et, s'il y en a un, le domaine propre
export async function modifierAdresseChambre(formData: FormData) {
  const gm = await exigerGM();
  const c = await chambreOuErreur(formData);
  const slug = texte(formData, "slug", 63).toLowerCase();
  const saisi = texte(formData, "domaine", 300);
  const domaine = saisi ? normaliserDomaine(saisi) : "";
  const plateforme = process.env.DOMAINE_PLATEFORME?.trim().toLowerCase() || "";

  if (!slugValide(slug)) redirectWithErreur(fiche(c.id), `« ${slug} » ne peut pas servir d’adresse : lettres minuscules, chiffres et tirets.`);
  if (domaine && !domaineValide(domaine)) redirectWithErreur(fiche(c.id), `« ${domaine} » n’est pas un nom de domaine valide.`);
  if (domaine && plateforme && (domaine === plateforme || domaine.endsWith(`.${plateforme}`))) {
    redirectWithErreur(fiche(c.id), `${domaine} appartient à la plateforme : l’adresse ${slug}.${plateforme} suffit.`);
  }
  const prise = await db.chambre.findFirst({
    where: { id: { not: c.id }, OR: [{ slug }, ...(domaine ? [{ domaine }] : [])] },
    select: { slug: true },
  });
  if (prise) redirectWithErreur(fiche(c.id), prise.slug === slug ? `L’adresse « ${slug} » est déjà prise.` : `${domaine} est déjà le domaine d’une autre Chambre.`);
  if (slug === c.slug && (domaine || null) === c.domaine) redirectWithFlash(fiche(c.id), "Adresse inchangée");

  await db.chambre.update({ where: { id: c.id }, data: { slug, domaine: domaine || null } });
  await noter(c.id, gm.nom, "adresse_changee", `Adresse : ${slug}${domaine ? `, domaine ${domaine}` : ""}.`);
  oublierAdresses();
  oublierAdressesChambres();
  revalidatePath("/gm", "layout");
  redirectWithFlash(fiche(c.id), "Adresse enregistrée");
}

// --- Offres ---

const montant = (fd: FormData, k: string) => {
  const n = Number(texte(fd, k, 20).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
};
// Vide : sans limite
const limite = (fd: FormData, k: string): number | null | undefined => {
  const v = texte(fd, k, 10);
  if (!v) return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : undefined;
};

export async function enregistrerOffre(formData: FormData) {
  await exigerGM();
  const id = texte(formData, "offreId", 50);
  const offre = await db.offre.findUnique({ where: { id }, select: { id: true } });
  if (!offre) redirectWithErreur("/gm/offres", "Offre inconnue.");
  const nom = texte(formData, "nom", 60);
  const forfait = montant(formData, "forfait");
  const parUtilisateur = montant(formData, "parUtilisateur");
  const offerts = limite(formData, "utilisateursOfferts");
  const maxMembres = limite(formData, "maxMembres");
  const maxUtilisateurs = limite(formData, "maxUtilisateurs");
  if (!nom) redirectWithErreur("/gm/offres", "Indiquez le nom de l’offre.");
  if (forfait === null || parUtilisateur === null) redirectWithErreur("/gm/offres", "Les prix sont des montants positifs.");
  if (offerts === undefined || maxMembres === undefined || maxUtilisateurs === undefined) {
    redirectWithErreur("/gm/offres", "Les limites sont des nombres entiers (vide : sans limite).");
  }
  const fonctions = [...new Set(formData.getAll("fonctions").map(String).filter(estFonction))];
  await db.offre.update({
    where: { id: offre.id },
    data: { nom, forfait, parUtilisateur, utilisateursOfferts: offerts ?? 0, maxMembres, maxUtilisateurs, fonctions },
  });
  revalidatePath("/", "layout");
  redirectWithFlash("/gm/offres", `Offre ${nom} enregistrée`);
}
