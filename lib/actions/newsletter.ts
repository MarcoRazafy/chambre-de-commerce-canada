"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { courrielsActifs } from "@/lib/courriel";
import { redirectWithErreur, redirectWithFlash } from "@/lib/flash";
import { exigerEquipe } from "@/lib/autorisations";
import { destinataires, envoyerLettre, envoyerTest, lireAudience, type Audience } from "@/lib/newsletter";

const texte = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const ADRESSE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function audienceDe(fd: FormData): Audience {
  return lireAudience({
    statuts: fd.getAll("statuts").map(String),
    etiquettes: fd.getAll("etiquettes").map(String),
    contacts: texte(fd, "contacts"),
    abonnes: fd.get("abonnes") === "1",
  });
}

// Enregistrer le brouillon, s'envoyer un test, ou envoyer à toute l'audience (bouton « intention »)
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
  }
  const lettre = id
    ? await prisma.lettre.update({ where: { id }, data: { sujet, contenu, audience } })
    : await prisma.lettre.create({ data: { sujet, contenu, audience, auteur: moi.nom } });
  const page = `/admin/newsletter/${lettre.id}`;

  if (intention === "test") {
    const ok = await envoyerTest(sujet, contenu, moi.email, moi.nom);
    if (!ok) redirectWithErreur(page, courrielsActifs() ? "Le test n’a pas pu partir. Réessayez." : "L’envoi de courriels n’est pas configuré (RESEND_API_KEY) : le test est écrit dans le journal du serveur.");
    redirectWithFlash(page, `Test envoyé à ${moi.email}`);
  }
  if (intention === "envoyer") {
    const liste = await destinataires(audience);
    if (!liste.length) redirectWithErreur(page, "Aucun destinataire pour cette audience.");
    if (!courrielsActifs()) redirectWithErreur(page, "L’envoi de courriels n’est pas configuré (RESEND_API_KEY) : rien n’est parti.");
    const partis = await envoyerLettre(sujet, contenu, liste);
    await prisma.lettre.update({ where: { id: lettre.id }, data: { statut: "envoyee", envoyeeLe: new Date(), destinataires: liste.length, envoyes: partis } });
    await prisma.auditLog.create({ data: { action: "lettre_envoyee", entite: "Lettre", entiteId: lettre.id, acteur: moi.nom, detail: `« ${sujet} » · ${partis} sur ${liste.length} destinataires.` } });
    revalidatePath("/admin/newsletter");
    redirectWithFlash("/admin/newsletter", `Lettre envoyée à ${partis} destinataire${partis > 1 ? "s" : ""}`);
  }
  revalidatePath("/admin/newsletter");
  redirectWithFlash(page, "Brouillon enregistré");
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
  const email = texte(formData, "email").toLowerCase(), prenom = texte(formData, "prenom") || email.split("@")[0];
  if (!ADRESSE.test(email)) redirectWithErreur("/admin/newsletter?onglet=abonnes", "Adresse e-mail invalide.");
  await prisma.abonne.upsert({ where: { email }, update: { prenom, desabonneLe: null }, create: { prenom, email, source: "equipe" } });
  revalidatePath("/admin/newsletter");
  redirectWithFlash("/admin/newsletter?onglet=abonnes", `${email} est abonné(e)`);
}

export async function desabonner(formData: FormData) {
  await exigerEquipe();
  await prisma.abonne.update({ where: { id: texte(formData, "id") }, data: { desabonneLe: new Date() } });
  revalidatePath("/admin/newsletter");
  redirectWithFlash("/admin/newsletter?onglet=abonnes", "Désabonnement enregistré");
}
