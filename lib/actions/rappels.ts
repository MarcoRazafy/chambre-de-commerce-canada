"use server";

import { revalidatePath } from "next/cache";
import { exigerEquipe } from "@/lib/autorisations";
import { courrielsActifs } from "@/lib/courriel";
import { prisma } from "@/lib/db";
import { redirectWithErreur, redirectWithFlash } from "@/lib/flash";
import { MESSAGE_DEFAUT, RAPPELS, SUJET_DEFAUT } from "@/lib/rappels";
import { envoyerTestRappel } from "@/lib/rappels-envoi";

const texte = (fd: FormData, k: string) => String(fd.get(k) ?? "").replace(/\r\n/g, "\n").trim();

// Onglet « Courriel » d'un événement : rappels activés, texte du rappel ; enregistrer, s'envoyer un test,
// ou revenir au texte par défaut (bouton « intention »)
export async function enregistrerRappels(formData: FormData) {
  const moi = await exigerEquipe();
  const id = texte(formData, "eventId");
  const page = `/admin/evenements/${id}?vue=courriel`;
  const e = await prisma.event.findUnique({ where: { id }, select: { titre: true } });
  if (!e) redirectWithErreur("/admin/evenements", "Événement introuvable.");

  const intention = texte(formData, "intention");
  const defaut = intention === "defaut";
  const sujet = texte(formData, "sujet").slice(0, 200);
  const message = texte(formData, "message").slice(0, 5000);
  if (!defaut && !message) redirectWithErreur(page, "Le message du rappel ne peut pas être vide.");

  await prisma.event.update({
    where: { id },
    data: {
      ...Object.fromEntries(RAPPELS.map((r) => [r.champ, formData.get(r.cle) === "1"])),
      // Le texte par défaut n'est pas recopié : il pourra évoluer sans toucher aux événements
      rappelSujet: defaut || !sujet || sujet === SUJET_DEFAUT ? null : sujet,
      rappelMessage: defaut || message === MESSAGE_DEFAUT ? null : message,
    },
  });
  revalidatePath(`/admin/evenements/${id}`);

  if (intention === "test") {
    const parti = await envoyerTestRappel(id, moi);
    if (!courrielsActifs()) redirectWithErreur(page, "L’envoi de courriels n’est pas configuré (variables SMTP de Brevo) : le test est écrit dans le journal du serveur.");
    if (!parti) redirectWithErreur(page, "Le test n’a pas pu partir. Réessayez.");
    redirectWithFlash(page, `Rappel de test envoyé à ${moi.email}`);
  }
  redirectWithFlash(page, defaut ? "Texte du rappel rétabli" : "Rappels enregistrés");
}
