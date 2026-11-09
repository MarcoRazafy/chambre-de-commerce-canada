"use server";

import { revalidatePath } from "next/cache";
import { exigerEquipe } from "@/lib/autorisations";
import { courrielsActifs } from "@/lib/courriel";
import { prisma } from "@/lib/db";
import { redirectWithErreur, redirectWithFlash } from "@/lib/flash";
import { lireDoc } from "@/lib/lettre-blocs";
import { toISODate } from "@/lib/enums";
import { DATES_MAX, debutEvenement, lireDateEnvoi, SUJET_DEFAUT } from "@/lib/rappels";
import { envoyerTestRappel } from "@/lib/rappels-envoi";

const texte = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const pageCourriel = (eventId: string, rappel?: string) => `/admin/evenements/${eventId}?vue=courriel${rappel ? `&rappel=${rappel}` : ""}`;

// Onglet « Courriel » d'un événement : ajouter ou modifier un rappel (délai, objet, lettre), et s'envoyer un test
export async function enregistrerRappel(formData: FormData) {
  const moi = await exigerEquipe();
  const eventId = texte(formData, "eventId");
  const id = texte(formData, "rappelId");
  const e = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, date: true, debut: true } });
  if (!e) redirectWithErreur("/admin/evenements", "Événement introuvable.");
  const retour = pageCourriel(eventId, id || "nouveau");

  // Dates d'envoi (heure de Madagascar) : au moins une, toutes avant le début de l'événement
  const debut = debutEvenement(toISODate(e.date), e.debut);
  const saisies = formData.getAll("dates").map(String).filter(Boolean);
  const dates = [...new Set(saisies.map(lireDateEnvoi))].filter((t): t is number => t !== null).sort((a, b) => a - b);
  if (!dates.length) redirectWithErreur(retour, "Ajoutez au moins une date d’envoi.");
  if (dates.some((t) => t >= debut)) redirectWithErreur(retour, "Chaque date d’envoi doit être avant le début de l’événement.");
  if (dates.length > DATES_MAX) redirectWithErreur(retour, `${DATES_MAX} dates d’envoi au plus par rappel.`);
  const titre = texte(formData, "titre").slice(0, 120);
  const sujet = texte(formData, "sujet").slice(0, 200);
  // La lettre vient de l'éditeur : relue et nettoyée avant d'être enregistrée
  const doc = lireDoc(String(formData.get("message") ?? "").slice(0, 200000));
  if (!doc?.sections.length) redirectWithErreur(retour, "Le message du rappel ne peut pas être vide.");
  const data = {
    titre: titre || null,
    dates: dates.map((t) => new Date(t)),
    avant: 0,
    sujet: !sujet || sujet === SUJET_DEFAUT ? null : sujet,
    message: JSON.stringify(doc),
  };

  if (id && !(await prisma.rappelEvenement.findFirst({ where: { id, eventId }, select: { id: true } }))) {
    redirectWithErreur(pageCourriel(eventId), "Rappel introuvable.");
  }
  const r = id
    ? await prisma.rappelEvenement.update({ where: { id }, data })
    : await prisma.rappelEvenement.create({ data: { ...data, eventId } });
  revalidatePath(`/admin/evenements/${eventId}`);

  if (texte(formData, "intention") === "test") {
    const parti = await envoyerTestRappel(r.id, moi);
    const page = pageCourriel(eventId, r.id);
    if (!courrielsActifs()) redirectWithErreur(page, "L’envoi de courriels n’est pas configuré (variables SMTP de Brevo) : le test est écrit dans le journal du serveur.");
    if (!parti) redirectWithErreur(page, "Le test n’a pas pu partir. Réessayez.");
    redirectWithFlash(page, `Rappel de test envoyé à ${moi.email}`);
  }
  redirectWithFlash(pageCourriel(eventId), titre ? `Rappel « ${titre} » enregistré` : "Rappel enregistré");
}

export async function supprimerRappel(formData: FormData) {
  await exigerEquipe();
  const eventId = texte(formData, "eventId");
  const id = texte(formData, "rappelId");
  await prisma.rappelEvenement.deleteMany({ where: { id, eventId } });
  revalidatePath(`/admin/evenements/${eventId}`);
  redirectWithFlash(pageCourriel(eventId), "Rappel supprimé");
}
