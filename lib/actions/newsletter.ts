"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { courrielsActifs, envoyerCourriel, gabarit, urlPublique } from "@/lib/courriel";
import { redirectWithErreur, redirectWithFlash } from "@/lib/flash";
import { exigerEquipe } from "@/lib/autorisations";
import { fmtDateHeure, lireCsvAbonnes, lireProgrammation } from "@/lib/lettres";
import {
  annulerEnvois,
  annulerEnvoisProgrammesPour,
  destinataires,
  envoyerLettre,
  envoyerTest,
  lireAudience,
  type Audience,
} from "@/lib/newsletter";

const texte = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const ADRESSE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ABONNES = "/admin/abonnes";
const SANS_COURRIELS = "L’envoi de courriels n’est pas configuré (RESEND_API_KEY) : rien n’est parti.";

function audienceDe(fd: FormData): Audience {
  return lireAudience({
    statuts: fd.getAll("statuts").map(String),
    etiquettes: fd.getAll("etiquettes").map(String),
    contacts: texte(fd, "contacts"),
    abonnes: fd.get("abonnes") === "1",
  });
}

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

// Enregistrer le brouillon, s'envoyer un test, envoyer tout de suite ou programmer l'envoi (bouton « intention »)
export async function enregistrerLettre(formData: FormData) {
  const moi = await exigerEquipe();
  const id = texte(formData, "id");
  const intention = texte(formData, "intention");
  const sujet = texte(formData, "sujet").slice(0, 200);
  const contenu = texte(formData, "contenu").slice(0, 20000);
  const audience = audienceDe(formData);
  const retourEdition = id ? `/admin/newsletter/${id}` : "/admin/newsletter/nouvelle";
  if (!sujet || !contenu) redirectWithErreur(retourEdition, "Indiquez l’objet et le texte de la lettre.");

  if (id) {
    const avant = await prisma.lettre.findUnique({ where: { id }, select: { statut: true } });
    if (!avant) redirectWithErreur("/admin/newsletter", "Lettre introuvable.");
    if (avant.statut === "envoyee") redirectWithErreur(`/admin/newsletter/${id}`, "Cette lettre est déjà partie : dupliquez-la pour en écrire une nouvelle.");
    if (avant.statut === "programmee") redirectWithErreur(`/admin/newsletter/${id}`, "Cette lettre est programmée : annulez la programmation pour la modifier.");
  }
  // Le texte est toujours enregistré, même si l'heure choisie est refusée : rien ne se perd
  const programmation = intention === "programmer" ? lireProgrammation(texte(formData, "programmeeLe")) : null;

  const lettre = id
    ? await prisma.lettre.update({ where: { id }, data: { sujet, contenu, audience } })
    : await prisma.lettre.create({ data: { sujet, contenu, audience, auteur: moi.nom } });
  const page = `/admin/newsletter/${lettre.id}`;
  revalidatePath("/admin/newsletter");

  if (intention === "test") {
    const ok = await envoyerTest(sujet, contenu, moi.email, moi.nom);
    if (!ok) redirectWithErreur(page, courrielsActifs() ? "Le test n’a pas pu partir. Réessayez." : "L’envoi de courriels n’est pas configuré (RESEND_API_KEY) : le test est écrit dans le journal du serveur.");
    redirectWithFlash(page, `Test envoyé à ${moi.email}`);
  }

  if (intention === "envoyer" || programmation) {
    if (programmation && "erreur" in programmation) redirectWithErreur(page, programmation.erreur);
    const quand = programmation && "date" in programmation ? programmation.date : undefined;
    const liste = await destinataires(audience);
    if (!liste.length) redirectWithErreur(page, "Aucun destinataire pour cette audience.");
    if (!courrielsActifs()) redirectWithErreur(page, SANS_COURRIELS);
    const partis = await envoyerLettre(lettre.id, sujet, contenu, liste, quand);
    if (!partis) redirectWithErreur(page, "Aucun courriel n’a pu partir. Réessayez dans un instant.");
    await prisma.lettre.update({
      where: { id: lettre.id },
      data: quand
        ? { statut: "programmee", programmeeLe: quand, destinataires: liste.length, envoyes: partis }
        : { statut: "envoyee", envoyeeLe: new Date(), destinataires: liste.length, envoyes: partis },
    });
    await prisma.auditLog.create({
      data: {
        action: quand ? "lettre_programmee" : "lettre_envoyee",
        entite: "Lettre",
        entiteId: lettre.id,
        acteur: moi.nom,
        detail: `« ${sujet} » · ${partis} sur ${liste.length} destinataires${quand ? ` · le ${fmtDateHeure(quand)}` : ""}.`,
      },
    });
    revalidatePath("/admin/newsletter");
    redirectWithFlash(
      "/admin/newsletter",
      quand
        ? `Lettre programmée le ${fmtDateHeure(quand)} pour ${pluriel(partis, "destinataire")}`
        : `Lettre envoyée à ${pluriel(partis, "destinataire")}`,
    );
  }
  redirectWithFlash(page, "Brouillon enregistré");
}

// Annuler un envoi programmé : les courriels sont retirés chez Resend et la lettre redevient un brouillon
export async function annulerProgrammation(formData: FormData) {
  const moi = await exigerEquipe();
  const id = texte(formData, "id");
  const retour = texte(formData, "retour") === "lettre" ? `/admin/newsletter/${id}` : "/admin/newsletter";
  const l = await prisma.lettre.findUnique({ where: { id }, select: { statut: true, programmeeLe: true, sujet: true } });
  if (!l || l.statut !== "programmee") redirectWithErreur(retour, "Cette lettre n’est pas programmée.");
  if (!l.programmeeLe || l.programmeeLe.getTime() <= Date.now() + 60_000) {
    redirectWithErreur(retour, "L’envoi est en cours ou déjà parti : il ne peut plus être annulé.");
  }
  const envois = await prisma.envoiLettre.findMany({ where: { lettreId: id }, select: { id: true, resendId: true } });
  const restants = await annulerEnvois(envois);
  if (restants) {
    await prisma.lettre.update({ where: { id }, data: { envoyes: restants } });
    revalidatePath("/admin/newsletter");
    redirectWithErreur(retour, `${pluriel(restants, "courriel")} n’ont pas pu être retirés de l’envoi. Réessayez « Annuler ».`);
  }
  await prisma.lettre.update({ where: { id }, data: { statut: "brouillon", programmeeLe: null, destinataires: 0, envoyes: 0 } });
  await prisma.auditLog.create({
    data: { action: "lettre_deprogrammee", entite: "Lettre", entiteId: id, acteur: moi.nom, detail: `« ${l.sujet} » repasse en brouillon.` },
  });
  revalidatePath("/admin/newsletter");
  redirectWithFlash(`/admin/newsletter/${id}`, "Envoi annulé : la lettre est de nouveau un brouillon");
}

export async function dupliquerLettre(formData: FormData) {
  const moi = await exigerEquipe();
  const l = await prisma.lettre.findUnique({ where: { id: texte(formData, "id") } });
  if (!l) redirectWithErreur("/admin/newsletter", "Lettre introuvable.");
  const copie = await prisma.lettre.create({ data: { sujet: l.sujet, contenu: l.contenu, audience: l.audience ?? {}, auteur: moi.nom } });
  redirectWithFlash(`/admin/newsletter/${copie.id}`, "Copie créée : modifiez-la puis envoyez-la");
}

export async function supprimerLettre(formData: FormData) {
  await exigerEquipe();
  await prisma.lettre.deleteMany({ where: { id: texte(formData, "id"), statut: "brouillon" } });
  revalidatePath("/admin/newsletter");
  redirectWithFlash("/admin/newsletter", "Brouillon supprimé");
}

// Abonnés à la lettre (personnes extérieures au réseau)
export async function ajouterAbonne(formData: FormData) {
  await exigerEquipe();
  const email = texte(formData, "email").toLowerCase();
  const prenom = texte(formData, "prenom").slice(0, 80) || email.split("@")[0];
  if (!ADRESSE.test(email)) redirectWithErreur(ABONNES, "Adresse e-mail invalide.");
  await prisma.abonne.upsert({
    where: { email },
    update: { prenom, desabonneLe: null, erreurLe: null },
    create: { prenom, email, source: "equipe" },
  });
  revalidatePath(ABONNES);
  redirectWithFlash(ABONNES, `${email} est abonné(e)`);
}

export async function desabonner(formData: FormData) {
  await exigerEquipe();
  const a = await prisma.abonne.update({ where: { id: texte(formData, "id") }, data: { desabonneLe: new Date() } });
  await annulerEnvoisProgrammesPour(a.email);
  revalidatePath(ABONNES);
  redirectWithFlash(ABONNES, `${a.email} est désabonné(e)`);
}

// Réabonner : aussi pour une adresse en erreur, une fois corrigée chez le destinataire
export async function reabonner(formData: FormData) {
  await exigerEquipe();
  const a = await prisma.abonne.update({ where: { id: texte(formData, "id") }, data: { desabonneLe: null, erreurLe: null } });
  revalidatePath(ABONNES);
  redirectWithFlash(ABONNES, `${a.email} reçoit de nouveau la lettre`);
}

// Import CSV : les adresses nouvelles sont abonnées ; celles déjà connues (même désabonnées) ne changent pas
export async function importerAbonnes(formData: FormData) {
  const moi = await exigerEquipe();
  const fichier = formData.get("fichier");
  if (!(fichier instanceof File) || !fichier.size) redirectWithErreur(ABONNES, "Choisissez un fichier CSV.");
  if (fichier.size > 2_000_000) redirectWithErreur(ABONNES, "Fichier trop lourd (2 Mo au plus).");
  const lus = lireCsvAbonnes(await fichier.text());
  if (!lus.length) redirectWithErreur(ABONNES, "Aucune adresse e-mail trouvée dans ce fichier.");
  const connues = new Set(
    (await prisma.abonne.findMany({ where: { email: { in: lus.map((l) => l.email) } }, select: { email: true } })).map((a) => a.email),
  );
  const nouveaux = lus.filter((l) => !connues.has(l.email));
  const { count } = await prisma.abonne.createMany({
    data: nouveaux.map((n) => ({ ...n, source: "import" })),
    skipDuplicates: true,
  });
  if (count) {
    await prisma.auditLog.create({
      data: { action: "abonnes_importes", entite: "Abonne", entiteId: "import", acteur: moi.nom, detail: `${pluriel(count, "abonné")} importé${count > 1 ? "s" : ""} depuis « ${fichier.name.slice(0, 80)} ».` },
    });
  }
  revalidatePath(ABONNES);
  const deja = lus.length - count;
  redirectWithFlash(ABONNES, `${pluriel(count, "abonné")} importé${count > 1 ? "s" : ""}${deja ? ` · ${deja} adresse${deja > 1 ? "s" : ""} déjà connue${deja > 1 ? "s" : ""}, laissée${deja > 1 ? "s" : ""} telle${deja > 1 ? "s" : ""} quelle${deja > 1 ? "s" : ""}` : ""}`);
}

// Inviter un abonné à devenir membre : un courriel avec le lien de la demande d'adhésion
export async function inviterAAdherer(formData: FormData) {
  const moi = await exigerEquipe();
  const a = await prisma.abonne.findUnique({ where: { id: texte(formData, "id") } });
  if (!a) redirectWithErreur(ABONNES, "Abonné introuvable.");
  if (a.desabonneLe || a.erreurLe) redirectWithErreur(ABONNES, "Cette adresse ne reçoit plus nos courriels.");
  if (!courrielsActifs()) redirectWithErreur(ABONNES, SANS_COURRIELS);
  const ok = await envoyerCourriel({
    a: a.email,
    sujet: "Rejoignez la CanCham",
    ...gabarit({
      titre: `Bonjour ${a.prenom},`,
      paragraphes: [
        "Vous suivez la lettre d’information de la Chambre de Commerce et de Coopération Canada–Madagascar. Merci de votre intérêt !",
        "En devenant membre, vous accédez à l’annuaire des entreprises, aux mises en relation entre membres, aux événements et aux ressources réservées, et votre entreprise gagne en visibilité des deux côtés de l’océan.",
        "La demande d’adhésion se fait en ligne en quelques minutes.",
      ],
      bouton: { libelle: "Demander mon adhésion", url: await urlPublique("/auth/inscription") },
    }),
  });
  if (!ok) redirectWithErreur(ABONNES, "L’invitation n’a pas pu partir. Réessayez.");
  await prisma.abonne.update({ where: { id: a.id }, data: { inviteLe: new Date() } });
  await prisma.auditLog.create({
    data: { action: "abonne_invite", entite: "Abonne", entiteId: a.id, acteur: moi.nom, detail: `Invitation à adhérer envoyée à ${a.email}.` },
  });
  revalidatePath(ABONNES);
  redirectWithFlash(ABONNES, `Invitation envoyée à ${a.email}`);
}
