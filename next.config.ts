import type { NextConfig } from "next";
import { PLAFOND_ENVOI_MO } from "./lib/plafonds";

function politiqueContenu(dev: boolean): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com https://drive.google.com",
    "form-action 'self'",
    "img-src 'self' data: blob: https://images.unsplash.com https://images.pexels.com https://i.ytimg.com",
    "media-src 'self' blob:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    `connect-src 'self'${dev ? " ws: wss:" : ""}`,
  ].join("; ");
}

const nextConfig: NextConfig = {
  agentRules: false,
  async headers() {
    const dev = process.env.NODE_ENV !== "production";
    const entetes = [
      { key: "Content-Security-Policy", value: politiqueContenu(dev) },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(self), microphone=(), geolocation=(), payment=()",
      },
      ...(dev
        ? []
        : [
            {
              key: "Strict-Transport-Security",
              value: "max-age=63072000; includeSubDomains; preload",
            },
          ]),
    ];
    return [
      { source: "/:chemin*", headers: entetes },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },

  async redirects() {
    const versAuth = (sous: string) => ({
      source: `/public/${sous}`,
      destination: `/auth/${sous}`,
      permanent: true,
    });
    const connexionAvec = (cle: string) => ({
      source: "/public",
      has: [{ type: "query" as const, key: cle }],
      destination: "/auth",
      permanent: false,
    });
    return [
      versAuth("inscription"),
      versAuth("mot-de-passe-oublie"),
      versAuth("nouveau-mot-de-passe"),
      ...["email", "erreur", "suite", "attente", "demande", "inscrit"].map(
        connexionAvec,
      ),
      { source: "/public/vitrine", destination: "/", permanent: true },
      { source: "/public", destination: "/", permanent: true },
      { source: "/public/:chemin*", destination: "/:chemin*", permanent: true },
    ];
  },

  allowedDevOrigins: [
    "192.168.*.*",
    "10.*.*.*",
    "100.*.*.*",
    "172.16.*.*",
    "*.trycloudflare.com",
    // Espaces des Chambres en local : « slug ».localhost
    "*.localhost",
  ],

  experimental: {
    serverActions: {
      bodySizeLimit: `${PLAFOND_ENVOI_MO}mb`,
    },
    proxyClientMaxBodySize: `${PLAFOND_ENVOI_MO}mb`,
  },
  images: {
    qualities: [75, 90],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
    ],
  },
};

export default nextConfig;
