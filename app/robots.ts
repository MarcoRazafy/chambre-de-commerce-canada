import type { MetadataRoute } from "next";
import { hoteDeLaRequete } from "@/lib/referencement";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const { origine, hote } = await hoteDeLaRequete();
  if (hote.type === "plateforme") {
    return {
      rules: { userAgent: "*", allow: "/", disallow: ["/connexion", "/mot-de-passe-oublie"] },
      sitemap: `${origine}/sitemap.xml`,
    };
  }
  if (hote.type === "gm" || (hote.type === "partage" && hote.espace === "equipe")) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: ["/c/", "/auth/inscription"], disallow: "/" },
    ...(hote.type === "partage" ? {} : { sitemap: `${origine}/sitemap.xml` }),
  };
}
