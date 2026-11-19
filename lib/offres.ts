export type EmplacementOffre = "partout" | "actualites" | "tableau_de_bord";

export const EMPLACEMENTS_OFFRE: Record<EmplacementOffre, string> = {
  actualites: "Actualités",
  tableau_de_bord: "Tableau de bord",
  partout: "Les deux",
};

export function estEmplacementOffre(v: string): v is EmplacementOffre {
  return v in EMPLACEMENTS_OFFRE;
}

export const OFFRES_DU_RAIL = 4;

export const OFFRES_ACCUEIL = 3;

export const OFFRE_CANCHAM = "cancham";
