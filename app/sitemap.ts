import type { MetadataRoute } from "next";
import { pagePublique } from "@/lib/evenements-publics";
import { hoteDeLaRequete, PAGES_SITE, slugDeLHote } from "@/lib/referencement";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { origine, hote, brut } = await hoteDeLaRequete();
  if (hote.type === "plateforme") {
    return PAGES_SITE.map((p) => ({ url: `${origine}${p}`, changeFrequency: "monthly", priority: p === "" ? 1 : 0.6 }));
  }
  if (hote.type === "gm" || hote.type === "partage") return [];
  const slug = await slugDeLHote(brut);
  if (!slug) return [];
  const page = await pagePublique(slug);
  return [
    { url: `${origine}/auth/inscription`, changeFrequency: "monthly", priority: 0.8 },
    ...(page
      ? [
          { url: `${origine}/c/${slug}/evenements`, changeFrequency: "weekly" as const, priority: 0.7 },
          ...page.aVenir.map((e) => ({ url: `${origine}/c/${slug}/evenements/${e.id}`, changeFrequency: "weekly" as const, priority: 0.6 })),
        ]
      : []),
  ];
}
