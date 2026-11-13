import "server-only";

// L'offre de la Chambre en cours (réglée par l'Admin GM) et la configuration de facturation qui en découle.
// Offre à la carte : les fonctions choisies par la Chambre, et leur prix ajouté au forfait.
import { prisma } from "@/lib/db";
import { fonctionsOuvertes } from "@/lib/fonctions-plateforme";
import { configPlateforme, forfaitOffre, UTILISATEURS_OFFERTS } from "@/lib/plateforme";

// fonctions : celles ouvertes à la Chambre ; choisies : son choix (offre à la carte) ; forfait : à la carte, base
// et fonctions choisies comprises
export async function offreDeLaChambre() {
  const c = await prisma.chambre.findFirst({ select: { offre: true, fonctionsChoisies: true } });
  if (!c) return null;
  return {
    ...c.offre,
    base: c.offre.forfait,
    forfait: forfaitOffre(c.offre, c.fonctionsChoisies),
    fonctions: fonctionsOuvertes(c.offre, c.fonctionsChoisies),
    choisies: c.fonctionsChoisies,
  };
}

// Prix de l'offre de la Chambre ; taxes et jour de facturation de l'environnement
export async function configDeLaChambre() {
  const base = configPlateforme();
  const offre = await offreDeLaChambre();
  return {
    config: offre ? { ...base, forfait: offre.forfait, parUtilisateur: offre.parUtilisateur } : base,
    offre,
    offerts: offre?.utilisateursOfferts ?? UTILISATEURS_OFFERTS,
  };
}
