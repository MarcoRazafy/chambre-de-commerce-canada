"use server";

// Espace Admin GM : connexion, offre et accès des Chambres, leur adresse, les offres de la plateforme.
// Hors de toute Chambre : écritures sans limite de Chambre (prismaSysteme), notées dans l'historique de la Chambre.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adresseOuSite, oublierAdressesChambres } from "@/lib/adresse-chambre";
import { fermerSessionGM, ouvrirSessionGM } from "@/lib/auth-gm";
import { verifier } from "@/lib/auth";
import { domaineValide, normaliserDomaine } from "@/lib/brevo-domaines";
import { marquerPayee } from "@/lib/abonnement-stripe";
import { oublierAdresses } from "@/lib/chambre-courante";
import { oublierReglages, prismaSysteme as db } from "@/lib/db";
import { lireRelances } from "@/lib/retards";
import { redirectWithErreur, redirectWithFlash } from "@/lib/flash";
import { estFonction, FONCTIONS } from "@/lib/fonctions-plateforme";
import { exigerGM } from "@/lib/gm";
import { slugValide } from "@/lib/hote-chambre";
import { lienEntree } from "@/lib/visite-gm";
import { avecChambre } from "@/lib/chambre-courante";
import { envoyerCourriel, urlPublique } from "@/lib/courriel";
import { creerJeton } from "@/lib/jetons";
import { courrielReinitialisation } from "@/lib/modeles-courriels";
import { minutes, oublier, origineAppelante, tentative } from "@/lib/limite";

const texte = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max);
const fiche = (id: string) => `/gm/chambres/${encodeURIComponent(id)}`;

async function noter(chambreId: string, acteur: string, action: string, detail: string) {
  await db.auditLog.create({ data: { chambreId, action, entite: "Chambre", entiteId: chambreId, acteur: `${acteur} (administrateur de la plateforme)`, detail } });
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
  redirect(suite.startsWith("/gm/") && !suite.startsWith("/gm/connexion") ? suite : "/gm");
}

export async function deconnexionGM() {
  await fermerSessionGM();
  redirect("/gm/connexion");
}

// --- Chambres ---

export async function changerOffreChambre(formData: FormData) {
  const gm = await exigerGM();
  const c = await chambreOuErreur(formData);
  const offre = await db.offre.findUnique({ where: { id: texte(formData, "offreId", 50) }, select: { id: true, nom: true, surMesure: true } });
  if (!offre) redirectWithErreur(fiche(c.id), "Offre inconnue.");
  if (offre.id === c.offreId) redirectWithFlash(fiche(c.id), "Offre inchangée");
  // Vers l'offre à la carte : la Chambre garde les fonctions qu'elle avait
  const avant = offre.surMesure ? await db.offre.findUnique({ where: { id: c.offreId }, select: { fonctions: true } }) : null;
  await db.chambre.update({ where: { id: c.id }, data: { offreId: offre.id, ...(avant ? { fonctionsChoisies: avant.fonctions } : {}) } });
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

// Adresse : l'identifiant (« slug », dans le lien de la demande d'adhésion) et, s'il y en a un, le domaine propre
export async function modifierAdresseChambre(formData: FormData) {
  const gm = await exigerGM();
  const c = await chambreOuErreur(formData);
  const slug = texte(formData, "slug", 63).toLowerCase();
  const saisi = texte(formData, "domaine", 300);
  const domaine = saisi ? normaliserDomaine(saisi) : "";
  const plateforme = process.env.DOMAINE_PLATEFORME?.trim().toLowerCase() || "";

  if (!slugValide(slug)) redirectWithErreur(fiche(c.id), `« ${slug} » ne peut pas servir d’identifiant : lettres minuscules, chiffres et tirets.`);
  if (domaine && !domaineValide(domaine)) redirectWithErreur(fiche(c.id), `« ${domaine} » n’est pas un nom de domaine valide.`);
  if (domaine && plateforme && (domaine === plateforme || domaine.endsWith(`.${plateforme}`))) {
    redirectWithErreur(fiche(c.id), `${domaine} appartient à la plateforme : il ne peut pas être le domaine d’une Chambre.`);
  }
  const prise = await db.chambre.findFirst({
    where: { id: { not: c.id }, OR: [{ slug }, ...(domaine ? [{ domaine }] : [])] },
    select: { slug: true },
  });
  if (prise) redirectWithErreur(fiche(c.id), prise.slug === slug ? `L’identifiant « ${slug} » est déjà pris.` : `${domaine} est déjà le domaine d’une autre Chambre.`);
  if (slug === c.slug && (domaine || null) === c.domaine) redirectWithFlash(fiche(c.id), "Adresse inchangée");

  await db.chambre.update({ where: { id: c.id }, data: { slug, domaine: domaine || null } });
  await noter(c.id, gm.nom, "adresse_changee", `Identifiant : ${slug}${domaine ? `, domaine ${domaine}` : ""}.`);
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
  const offre = await db.offre.findUnique({ where: { id }, select: { id: true, surMesure: true } });
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
  // À la carte : le prix de chaque fonction (vide : 0)
  const prixFonctions: Record<string, number> = {};
  if (offre.surMesure) {
    for (const f of FONCTIONS) {
      const p = texte(formData, `prix_${f.cle}`, 20) ? montant(formData, `prix_${f.cle}`) : 0;
      if (p === null) redirectWithErreur("/gm/offres", "Les prix sont des montants positifs.");
      prixFonctions[f.cle] = p;
    }
  }
  await db.offre.update({
    where: { id: offre.id },
    data: {
      nom, forfait, parUtilisateur, utilisateursOfferts: offerts ?? 0, maxMembres, maxUtilisateurs, fonctions,
      ...(offre.surMesure ? { prixFonctions } : {}),
    },
  });
  revalidatePath("/", "layout");
  redirectWithFlash("/gm/offres", `Offre ${nom} enregistrée`);
}

// --- Paiements ---

// Une facture de l'abonnement réglée autrement (virement…) : notée payée par l'Admin GM
export async function marquerFacturePayee(formData: FormData) {
  const gm = await exigerGM();
  const c = await chambreOuErreur(formData);
  const id = texte(formData, "factureId", 100);
  const f = await db.facturePlateforme.findFirst({ where: { id, chambreId: c.id }, select: { numero: true, payeeLe: true } });
  if (!f) redirectWithErreur(fiche(c.id), "Facture introuvable.");
  if (f.payeeLe) redirectWithFlash(fiche(c.id), "Facture déjà payée");
  await marquerPayee(id, null, `${gm.nom} (administrateur de la plateforme)`);
  revalidatePath("/gm", "layout");
  redirectWithFlash(fiche(c.id), `Facture ${f.numero} payée`);
}

// --- Paramètres : retards de paiement de l'abonnement ---

export async function enregistrerReglages(formData: FormData) {
  await exigerGM();
  const delai = Number(texte(formData, "delaiRetard", 4));
  const relances = lireRelances(texte(formData, "relances", 60));
  const action = texte(formData, "actionRetard", 20);
  const commission = Number(texte(formData, "commissionCotisations", 10).replace(",", ".") || "0");
  if (!Number.isInteger(delai) || delai < 0 || delai > 365) redirectWithErreur("/gm/parametres", "Le délai est un nombre de jours, de 0 à 365.");
  if (!relances) redirectWithErreur("/gm/parametres", "Les relances sont des jours après la facture, de 1 à 365 (ex. 1, 7, 14).");
  if (action !== "lecture" && action !== "blocage") redirectWithErreur("/gm/parametres", "Choisissez ce qui se passe après le délai.");
  if (!Number.isFinite(commission) || commission < 0 || commission > 30) redirectWithErreur("/gm/parametres", "La part de la plateforme va de 0 à 30 %.");
  const commissionCotisations = Math.round(commission * 100) / 100;
  await db.reglagesPlateforme.upsert({
    where: { id: "plateforme" },
    create: { id: "plateforme", delaiRetard: delai, relances, actionRetard: action, commissionCotisations },
    update: { delaiRetard: delai, relances, actionRetard: action, commissionCotisations },
  });
  oublierReglages();
  oublierAdresses();
  revalidatePath("/gm", "layout");
  redirectWithFlash("/gm/parametres", "Paramètres enregistrés");
}

// Identité de la plateforme sur les factures de l'abonnement (Paramètres › Plateforme)
export async function enregistrerIdentitePlateforme(formData: FormData) {
  await exigerGM();
  const retour = "/gm/parametres?onglet=plateforme";
  const courriel = texte(formData, "courriel", 200).toLowerCase();
  if (courriel && !/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(courriel)) redirectWithErreur(retour, "Indiquez une adresse e-mail valide.");
  const data = {
    nom: texte(formData, "nom", 120),
    raisonSociale: texte(formData, "raisonSociale", 200),
    adresse: String(formData.get("adresse") ?? "").replace(/\r\n/g, "\n").trim().slice(0, 400),
    courriel,
    telephone: texte(formData, "telephone", 60),
    neq: texte(formData, "neq", 40),
    numeroTps: texte(formData, "numeroTps", 40),
    numeroTvq: texte(formData, "numeroTvq", 40),
    hebergeur: texte(formData, "hebergeur", 300),
  };
  await db.reglagesPlateforme.upsert({ where: { id: "plateforme" }, create: { id: "plateforme", ...data }, update: data });
  revalidatePath("/", "layout");
  redirectWithFlash(retour, "Identité de la plateforme enregistrée");
}

// --- Lien de connexion à un compte de l'équipe ---
// Un lien pour choisir un nouveau mot de passe (une heure, un seul usage), envoyé à l'adresse du compte depuis
// la Chambre (son expéditeur, son adresse) ; noté dans l'historique
export async function envoyerLienConnexion(formData: FormData) {
  const gm = await exigerGM();
  const c = await chambreOuErreur(formData);
  const userId = texte(formData, "userId", 100);
  const u = await db.user.findFirst({ where: { id: userId, chambreId: c.id, role: "admin" }, select: { id: true, nom: true, email: true } });
  if (!u) redirectWithErreur(fiche(c.id), "Compte introuvable.");
  const attente = tentative(`gm-lien:${u.id}`, 3, 60 * 60 * 1000);
  if (attente) redirectWithErreur(fiche(c.id), `Un lien vient déjà d’être envoyé. Réessayez dans ${minutes(attente)} minute${minutes(attente) > 1 ? "s" : ""}.`);
  const envoye = await avecChambre(c.id, async () => {
    const base = await urlPublique("/auth/nouveau-mot-de-passe");
    const jeton = await creerJeton(u.id, "reinitialisation");
    return envoyerCourriel(courrielReinitialisation(u.email, u.nom, `${base}?jeton=${jeton}`));
  });
  if (!envoye) redirectWithErreur(fiche(c.id), "Le courriel n’est pas parti : l’envoi de courriels n’est pas configuré.");
  await noter(c.id, gm.nom, "lien_connexion_envoye", `Lien de connexion envoyé à ${u.nom} (${u.email}).`);
  redirectWithFlash(fiche(c.id), `Lien envoyé à ${u.email}`);
}

// --- Mode développeur ---

// « Entrer » : une visite dans l'espace de la Chambre, si elle l'autorise (dans le compte de son super admin
// le plus ancien) ; l'entrée est notée dans son journal
export async function entrerDansChambre(formData: FormData) {
  const gm = await exigerGM();
  const c = await chambreOuErreur(formData);
  const chambre = await db.chambre.findUnique({ where: { id: c.id }, select: { accesDevJusqua: true } });
  if (!chambre?.accesDevJusqua || chambre.accesDevJusqua <= new Date()) {
    redirectWithErreur(fiche(c.id), "Cette Chambre n’autorise pas l’accès : mode développeur désactivé.");
  }
  const compte = await db.user.findFirst({
    where: { chambreId: c.id, role: "admin", niveauEquipe: "administrateur" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!compte) redirectWithErreur(fiche(c.id), "Cette Chambre n’a pas de super admin.");
  const adresse = await adresseOuSite(c.id, "equipe");
  if (!adresse) redirectWithErreur(fiche(c.id), "Cette Chambre n’a pas encore d’adresse.");
  redirect(`${adresse}/auth/entree-gm?${new URLSearchParams({ jeton: lienEntree({ c: c.id, u: compte.id, g: gm.id, n: gm.nom }) })}`);
}
