"use server";

import { revalidatePath } from "next/cache";
import { exigerEquipe } from "@/lib/autorisations";
import { prisma } from "@/lib/db";
import { redirectWithErreur, redirectWithFlash } from "@/lib/flash";
import type { MemberStatus } from "@/lib/types";
import { SITUATIONS_REGLE } from "@/lib/tags";
import { appliquerReglesTags } from "@/lib/tags-auto";
import { chambreCourante } from "@/lib/chambre-courante";

// Tags automatiques (page Tags) : ajouter une règle, l'activer ou la désactiver, la supprimer.
// Chaque changement est appliqué aussitôt à toutes les entreprises.
const PAGE = "/admin/etiquettes";
const texte = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const appliquees = (n: number) => (n ? ` · ${n} entreprise${n > 1 ? "s" : ""} mise${n > 1 ? "s" : ""} à jour` : "");

export async function ajouterRegleTag(formData: FormData) {
  await exigerEquipe();
  const statut = texte(formData, "statut");
  const tag = texte(formData, "tag").replace(/\s+/g, " ").slice(0, 60);
  if (!SITUATIONS_REGLE.some(([s]) => s === statut)) redirectWithErreur(PAGE, "Choisissez une situation.");
  if (!tag) redirectWithErreur(PAGE, "Indiquez le tag à poser.");
  const chambreId = await chambreCourante();
  await prisma.tag.upsert({ where: { chambreId_nom: { chambreId, nom: tag } }, create: { nom: tag }, update: {} });
  await prisma.regleTag.upsert({
    where: { chambreId_statut_tag: { chambreId, statut: statut as MemberStatus, tag } },
    create: { statut: statut as MemberStatus, tag },
    update: { actif: true },
  });
  const n = await appliquerReglesTags();
  revalidatePath("/admin", "layout");
  redirectWithFlash(PAGE, `Tag automatique « ${tag} » ajouté${appliquees(n)}`);
}

export async function basculerRegleTag(formData: FormData) {
  await exigerEquipe();
  const r = await prisma.regleTag.findUnique({ where: { id: texte(formData, "id") } });
  if (!r) redirectWithErreur(PAGE, "Règle introuvable.");
  await prisma.regleTag.update({ where: { id: r.id }, data: { actif: !r.actif } });
  const n = r.actif ? 0 : await appliquerReglesTags();
  revalidatePath("/admin", "layout");
  redirectWithFlash(PAGE, r.actif ? `« ${r.tag} » n’est plus posé automatiquement` : `« ${r.tag} » est de nouveau automatique${appliquees(n)}`);
}

// Supprimer une règle : les entreprises gardent le tag déjà posé ; il n'est simplement plus géré
export async function supprimerRegleTag(formData: FormData) {
  await exigerEquipe();
  const r = await prisma.regleTag.findUnique({ where: { id: texte(formData, "id") } });
  if (r) await prisma.regleTag.delete({ where: { id: r.id } });
  revalidatePath("/admin", "layout");
  redirectWithFlash(PAGE, "Règle supprimée");
}
