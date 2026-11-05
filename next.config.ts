import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Le proxy garde le corps des requêtes en mémoire : 10 Mo par défaut, trop peu pour les vidéos de la bibliothèque (100 Mo)
    proxyClientMaxBodySize: '105mb',
  },
};

export default nextConfig;
