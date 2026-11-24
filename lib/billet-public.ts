import "server-only";

import { avecChambre, chambreCourante, chambreDuSlug } from "@/lib/chambre-courante";
import { urlPublique } from "@/lib/courriel";
import { prismaSysteme } from "@/lib/db";
import { redirectWithErreur } from "@/lib/flash";

export const cheminEvenementPublic = (slug: string, eventId: string) => `/c/${slug}/evenements/${eventId}`;

export const cheminBillet = (slug: string, eventId: string, params: Record<string, string>) =>
  `${cheminEvenementPublic(slug, eventId)}/billet?${new URLSearchParams(params)}`;

export async function slugDeLaChambre(chambreId?: string): Promise<string> {
  const id = chambreId ?? (await chambreCourante());
  const c = await prismaSysteme.chambre.findUnique({ where: { id }, select: { slug: true } });
  return c?.slug ?? id;
}

export async function lienBillet(eventId: string, code: string): Promise<string> {
  return urlPublique(cheminBillet(await slugDeLaChambre(), eventId, { code }));
}

export async function dansLaChambreDuFormulaire<T>(formData: FormData, fn: (slug: string) => Promise<T>): Promise<T> {
  const slug = String(formData.get("chambre") ?? "").trim().toLowerCase();
  const chambreId = /^[a-z0-9-]{1,63}$/.test(slug) ? await chambreDuSlug(slug) : null;
  if (!chambreId) redirectWithErreur("/", "Chambre introuvable.");
  return avecChambre(chambreId, () => fn(slug));
}
