import "server-only";

import type { Metadata } from "next";
import { chambreCouranteOuRien } from "@/lib/chambre-courante";
import { getProfilChambre } from "@/lib/profil-chambre";
import { hoteDeLaRequete } from "@/lib/referencement";
import { baseSite } from "@/lib/site";

const PLATEFORME = "L’Alliée Virtuelle";
const DESCRIPTION_PLATEFORME =
  "La plateforme des Chambres de commerce : adhésions, cotisations, événements, annuaire des membres et échanges, dans un espace à vos couleurs.";

const court = (t: string, max = 160) => {
  const s = t.replace(/\s+/g, " ").trim();
  return s.length <= max ? s : `${s.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
};

export async function metadonneesParDefaut(): Promise<Metadata> {
  let origine = baseSite();
  let type: string = "autre";
  try {
    const r = await hoteDeLaRequete();
    if (r.brut) origine = r.origine;
    type = r.hote.type;
  } catch {}
  const commun: Metadata = {
    metadataBase: new URL(origine),
    openGraph: { locale: "fr_FR", type: "website" },
    twitter: { card: "summary_large_image" },
  };

  if (type === "plateforme") {
    return {
      ...commun,
      title: { default: `${PLATEFORME} · La plateforme des Chambres de commerce`, template: `%s · ${PLATEFORME}` },
      description: DESCRIPTION_PLATEFORME,
      applicationName: PLATEFORME,
      appleWebApp: { capable: true, title: PLATEFORME, statusBarStyle: "default" },
      openGraph: { ...commun.openGraph, siteName: PLATEFORME, images: [{ url: "/apercu", width: 1200, height: 630, alt: `${PLATEFORME}, la plateforme des Chambres de commerce` }] },
    };
  }
  if (type === "gm") {
    return { ...commun, title: { default: `Administrateur · ${PLATEFORME}`, template: `%s · ${PLATEFORME}` }, applicationName: PLATEFORME, robots: { index: false, follow: false } };
  }

  const chambreId = await chambreCouranteOuRien().catch(() => null);
  if (!chambreId) {
    return { ...commun, title: { default: PLATEFORME, template: `%s · ${PLATEFORME}` }, description: DESCRIPTION_PLATEFORME, applicationName: PLATEFORME };
  }
  const p = await getProfilChambre();
  const description = p.description ? court(p.description) : `L’espace des membres de ${p.nom} : annuaire, événements, rendez-vous et échanges.`;
  const image = p.couverture || p.logo;
  return {
    ...commun,
    title: { default: p.nom, template: `%s · ${p.nom}` },
    description,
    applicationName: p.nom,
    appleWebApp: { capable: true, title: p.nom, statusBarStyle: "default" },
    openGraph: { ...commun.openGraph, siteName: p.nom, ...(image ? { images: [{ url: image, alt: p.nom }] } : {}) },
  };
}
