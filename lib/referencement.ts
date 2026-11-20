import "server-only";

import { headers } from "next/headers";
import { resoudreHote } from "@/lib/chambre-courante";
import { prismaSysteme } from "@/lib/db";
import { lireHote, type Hote } from "@/lib/hote-chambre";

export const PAGES_SITE = ["", "/tarifs", "/devenir-membre", "/creer-une-chambre", "/contact", "/conditions", "/confidentialite", "/mentions-legales"];

export async function hoteDeLaRequete(): Promise<{ origine: string; hote: Hote; brut: string }> {
  const h = await headers();
  const brut = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0].trim();
  const proto = h.get("x-forwarded-proto")?.split(",")[0].trim() || (process.env.NODE_ENV === "production" ? "https" : "http");
  return {
    origine: `${proto}://${brut}`,
    hote: lireHote(brut, process.env.DOMAINE_PLATEFORME ?? null, process.env.NODE_ENV !== "production"),
    brut,
  };
}

export async function slugDeLHote(brut: string): Promise<string | null> {
  const r = await resoudreHote(brut);
  if (!r.id || r.suspendue) return null;
  return (await prismaSysteme.chambre.findUnique({ where: { id: r.id }, select: { slug: true } }))?.slug ?? null;
}
