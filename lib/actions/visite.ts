"use server";

// Fin d'une visite de l'Admin GM (mode développeur) : retour à la fiche de la Chambre dans l'espace GM
import { redirect } from "next/navigation";
import { fermerSession } from "@/lib/auth";
import { chambreCourante } from "@/lib/chambre-courante";
import { prisma } from "@/lib/db";
import { adresseGM, fermerVisite, visiteCourante } from "@/lib/visite-gm";

export async function quitterVisite() {
  const visite = await visiteCourante();
  const chambreId = await chambreCourante();
  if (visite) {
    await prisma.auditLog.create({
      data: { action: "visite_gm_fin", entite: "Chambre", entiteId: chambreId, acteur: `${visite.n} (Admin GM)`, detail: "Sortie de l’Admin GM." },
    });
  }
  await fermerSession();
  await fermerVisite();
  redirect(visite ? `${adresseGM()}/gm/chambres/${encodeURIComponent(chambreId)}` : "/auth");
}
