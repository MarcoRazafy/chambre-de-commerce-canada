import type { MetadataRoute } from "next";

// Plateforme privée : rien à indexer
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
