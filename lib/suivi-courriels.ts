import "server-only";

import { revalidatePath } from "next/cache";
import { prismaSysteme } from "@/lib/db";
import type { Effet } from "@/lib/brevo-webhook";

// Applique un événement de suivi (webhook Brevo ou Resend) : sur l'envoi de lettre concerné,
// et sur l'abonné de cette adresse. La première date compte ; un clic vaut aussi ouverture.
// Appelé par le fournisseur, sans session : la Chambre est celle de la lettre (envoi inconnu, par exemple un
// courriel de compte : l'adresse est notée dans toutes les Chambres, comme un rebond l'exige).
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
  const lettre = cible
    ? await prismaSysteme.envoiLettre.findFirst({ where: cible, select: { lettre: { select: { chambreId: true } } } })
    : null;
  const chambre = lettre ? { chambreId: lettre.lettre.chambreId } : {};
  if (effet.envoi && cible) {
    await prismaSysteme.envoiLettre.updateMany({ where: { ...cible, [effet.envoi]: null }, data: { [effet.envoi]: moment } });
    if (effet.envoi === "clicLe") {
      await prismaSysteme.envoiLettre.updateMany({ where: { ...cible, ouvertLe: null }, data: { ouvertLe: moment } });
    }
  }
  if (effet.abonne && adresse) {
    await prismaSysteme.abonne.updateMany({
      where: { email: adresse.toLowerCase(), [effet.abonne]: null, ...chambre },
      data: { [effet.abonne]: moment },
    });
  }
  if (effet.envoi || effet.abonne) {
    revalidatePath("/admin/newsletter");
  }
}
