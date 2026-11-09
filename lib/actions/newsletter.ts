"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { courrielsActifs } from "@/lib/courriel";
import { redirectWithErreur, redirectWithFlash } from "@/lib/flash";
import { exigerEquipe } from "@/lib/autorisations";
import { fmtDateHeure, lireProgrammation } from "@/lib/lettres";
import {
  destinataires,
  envoyerLettre,
  envoyerTest,
  lireAudience,
  type Audience,
} from "@/lib/newsletter";

const texte = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const SANS_COURRIELS = "L’envoi de courriels n’est pas configuré (variables SMTP de Brevo) : rien n’est parti.";

function audienceDe(fd: FormData): Audience {
  return lireAudience({
    statuts: fd.getAll("statuts").map(String),
    etiquettes: fd.getAll("etiquettes").map(String),
    contacts: texte(fd, "contacts"),
    abonnes: fd.get("abonnes") === "1",
    evenement: texte(fd, "evenement"),
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
    if (avant.statut === "envoi") redirectWithErreur(`/admin/newsletter/${id}`, "Cette lettre est en cours d’envoi.");
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
    if (!ok) redirectWithErreur(page, courrielsActifs() ? "Le test n’a pas pu partir. Réessayez." : "L’envoi de courriels n’est pas configuré (variables SMTP de Brevo) : le test est écrit dans le journal du serveur.");
    redirectWithFlash(page, `Test envoyé à ${moi.email}`);
  }

  if (intention === "envoyer" || programmation) {
    if (programmation && "erreur" in programmation) redirectWithErreur(page, programmation.erreur);
    const quand = programmation && "date" in programmation ? programmation.date : undefined;
    const liste = await destinataires(audience);
    if (!liste.length) redirectWithErreur(page, "Aucun destinataire pour cette audience.");
    if (!courrielsActifs()) redirectWithErreur(page, SANS_COURRIELS);
    // Programmée : rien ne part maintenant, le serveur l'enverra à l'heure dite (destinataires lus à ce moment-là)
    const partis = quand ? 0 : await envoyerLettre(lettre.id, sujet, contenu, liste);
    if (!quand && !partis) redirectWithErreur(page, "Aucun courriel n’a pu partir. Réessayez dans un instant.");
    await prisma.lettre.update({
      where: { id: lettre.id },
      data: quand
        ? { statut: "programmee", programmeeLe: quand, destinataires: liste.length, envoyes: 0 }
        : { statut: "envoyee", envoyeeLe: new Date(), destinataires: liste.length, envoyes: partis },
    });
    await prisma.auditLog.create({
      data: {
        action: quand ? "lettre_programmee" : "lettre_envoyee",
        entite: "Lettre",
        entiteId: lettre.id,
        acteur: moi.nom,
        detail: quand ? `« ${sujet} » · le ${fmtDateHeure(quand)} · ${liste.length} destinataires prévus.` : `« ${sujet} » · ${partis} sur ${liste.length} destinataires.`,
      },
    });
    revalidatePath("/admin/newsletter");
    redirectWithFlash(
      "/admin/newsletter",
      quand
        ? `Lettre programmée le ${fmtDateHeure(quand)} · ${pluriel(liste.length, "destinataire")} aujourd’hui`
        : `Lettre envoyée à ${pluriel(partis, "destinataire")}`,
    );
  }
  redirectWithFlash(page, "Brouillon enregistré");
}

// Annuler un envoi programmé : la lettre redevient un brouillon, tant que son envoi n'a pas commencé
export async function annulerProgrammation(formData: FormData) {
  const moi = await exigerEquipe();
  const id = texte(formData, "id");
  const retour = texte(formData, "retour") === "lettre" ? `/admin/newsletter/${id}` : "/admin/newsletter";
  const l = await prisma.lettre.findUnique({ where: { id }, select: { sujet: true } });
  if (!l) redirectWithErreur(retour, "Lettre introuvable.");
  const { count } = await prisma.lettre.updateMany({
    where: { id, statut: "programmee" },
    data: { statut: "brouillon", programmeeLe: null, destinataires: 0, envoyes: 0 },
  });
  if (!count) redirectWithErreur(retour, "L’envoi est en cours ou déjà parti : il ne peut plus être annulé.");
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
