"use server";

import { redirect } from "next/navigation";
import { avecChambre } from "@/lib/chambre-courante";
import { prisma } from "@/lib/db";
import { signatureValide } from "@/lib/newsletter";

// « Confirmer le désabonnement » : seul ce clic désabonne (un antivirus ou une messagerie qui ouvre le lien de la
// lettre ne désabonne personne). La signature est vérifiée de nouveau. La Chambre vient du lien signé (espace
// partagé) ; un lien plus ancien vaut à l'adresse de sa Chambre. Une lettre programmée lit ses destinataires au
// moment de partir : elle ne parviendra plus.
export async function confirmerDesabonnement(formData: FormData) {
  const e = String(formData.get("e") ?? "").slice(0, 320);
  const s = String(formData.get("s") ?? "").slice(0, 64);
  const c = String(formData.get("c") ?? "").slice(0, 64);
  const params = new URLSearchParams({ e, s, ...(c ? { c } : {}) });
  if (!e || !s || !signatureValide(e, s, c)) redirect(`/desabonnement?${params}`);
  const desabonner = () => prisma.abonne.updateMany({ where: { email: e.toLowerCase(), desabonneLe: null }, data: { desabonneLe: new Date() } });
  await (c ? avecChambre(c, desabonner) : desabonner());
  redirect(`/desabonnement?${params}&fait=1`);
}
