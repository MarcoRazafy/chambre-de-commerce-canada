import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { EnregistrementApplication } from "@/components/Application";
import { IndicateurEnvois } from "@/components/EnvoisSuivis";
import { RetoursFormulaire } from "@/components/Mouvement";
import { Toast } from "@/components/Toast";
import {
  Fraunces,
  Hammersmith_One,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  Inter,
} from "next/font/google";
import { baseSite } from "@/lib/site";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const hammersmith = Hammersmith_One({
  variable: "--font-hammersmith",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(baseSite()),
  title: {
    default:
      "IMPACT 261 — Chambre de Commerce et de Coopération Canada–Madagascar",
    template: "%s · IMPACT 261",
  },
  description:
    "Le réseau des entreprises du Canada et de Madagascar : événements, mises en relation et accompagnement à l’export.",
  applicationName: "IMPACT 261",
  appleWebApp: {
    capable: true,
    title: "IMPACT 261",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f1d2c",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      className={`${fraunces.variable} ${plexSans.variable} ${plexMono.variable} ${hammersmith.variable} ${inter.variable}`}
    >
      <body>
        {children}
        <Suspense>
          <Toast />
          <RetoursFormulaire />
        </Suspense>
        <EnregistrementApplication />
        <IndicateurEnvois />
      </body>
    </html>
  );
}
