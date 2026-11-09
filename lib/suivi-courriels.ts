import "server-only";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import type { Effet } from "@/lib/brevo-webhook";

// Applique un événement de suivi (webhook Brevo ou Resend) : sur l'envoi de lettre concerné,
// et sur l'abonné de cette adresse. La première date compte ; un clic vaut aussi ouverture.
export async function appliquerSuivi({
  effet,
  envoi,
  adresse,
  moment,
}: {
  effet: Effet;
  envoi: { id?: string | null; fournisseurId?: string | null };
  adresse?: string | null;
  moment: Date;
}): Promise<void> {
  const cible = envoi.id ? { id: envoi.id } : envoi.fournisseurId ? { resendId: envoi.fournisseurId } : null;
  if (effet.envoi && cible) {
    await prisma.envoiLettre.updateMany({ where: { ...cible, [effet.envoi]: null }, data: { [effet.envoi]: moment } });
    if (effet.envoi === "clicLe") {
      await prisma.envoiLettre.updateMany({ where: { ...cible, ouvertLe: null }, data: { ouvertLe: moment } });
    }
  }
  if (effet.abonne && adresse) {
    await prisma.abonne.updateMany({
      where: { email: adresse.toLowerCase(), [effet.abonne]: null },
      data: { [effet.abonne]: moment },
    });
  }
  if (effet.envoi || effet.abonne) {
    revalidatePath("/admin/newsletter");
    revalidatePath("/admin/abonnes");
  }
}
