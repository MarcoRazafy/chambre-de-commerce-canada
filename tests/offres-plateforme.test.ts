import { describe, expect, it } from "vitest";
import { estFonction, FONCTIONS } from "@/lib/fonctions-plateforme";
import { configPlateforme, facturePlateforme, offreGratuite, utilisateursPayants } from "@/lib/plateforme";

const config = (forfait: number, parUtilisateur: number) => ({ ...configPlateforme({}), forfait, parUtilisateur });

describe("facture de l'abonnement selon l'offre de la Chambre", () => {
  it("offre payante : forfait + comptes d'équipe au-delà des comptes offerts", () => {
    const f = facturePlateforme(6, config(100, 15), 1);
    expect(f.payants).toBe(5);
    expect(f.offerts).toBe(1);
    expect(f.sousTotal).toBe(175);
    // Deux comptes offerts : un de moins à payer
    expect(facturePlateforme(6, config(100, 15), 2).sousTotal).toBe(160);
    // Plus de comptes offerts que de comptes : rien en plus du forfait
    expect(facturePlateforme(1, config(100, 15), 3).sousTotal).toBe(100);
  });

  it("offre gratuite : ni forfait ni prix par compte", () => {
    expect(offreGratuite({ forfait: 0, parUtilisateur: 0 })).toBe(true);
    expect(offreGratuite({ forfait: 0, parUtilisateur: 15 })).toBe(false);
    expect(offreGratuite({ forfait: 100, parUtilisateur: 0 })).toBe(false);
    expect(utilisateursPayants(3, 1)).toBe(2);
  });

  it("fonctions qu'une offre peut inclure", () => {
    expect(FONCTIONS.map((f) => f.cle)).toContain("newsletter");
    expect(estFonction("evenements")).toBe(true);
    expect(estFonction("membres")).toBe(false);
  });
});
