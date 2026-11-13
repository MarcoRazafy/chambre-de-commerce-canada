import { describe, expect, it } from "vitest";
import { fonctionsOuvertes, libellesFonctions } from "@/lib/fonctions-plateforme";
import { configPlateforme, facturePlateforme, forfaitOffre, lirePrixFonctions, offreGratuite } from "@/lib/plateforme";

const aLaCarte = {
  forfait: 40,
  surMesure: true,
  fonctions: ["evenements", "newsletter", "maillage"],
  prixFonctions: { evenements: 15, newsletter: 10.5, maillage: 0 },
};

describe("offre sur mesure (à la carte)", () => {
  it("le forfait : la base plus les fonctions choisies, parmi celles de l'offre", () => {
    expect(forfaitOffre(aLaCarte, [])).toBe(40);
    expect(forfaitOffre(aLaCarte, ["evenements"])).toBe(55);
    expect(forfaitOffre(aLaCarte, ["evenements", "newsletter", "maillage"])).toBe(65.5);
    // Une fonction hors de l'offre ne compte pas
    expect(forfaitOffre(aLaCarte, ["evenements", "messagerie"])).toBe(55);
    // Offre fixe : son forfait, quel que soit le choix
    expect(forfaitOffre({ ...aLaCarte, surMesure: false, forfait: 100 }, ["evenements"])).toBe(100);
  });

  it("les prix illisibles ou négatifs sont ignorés", () => {
    expect(lirePrixFonctions({ a: 10, b: -3, c: "12", d: Number.NaN })).toEqual({ a: 10 });
    expect(lirePrixFonctions(null)).toEqual({});
    expect(lirePrixFonctions([1, 2])).toEqual({});
  });

  it("la facture du mois compte les fonctions choisies et les comptes d'équipe en plus", () => {
    const forfait = forfaitOffre(aLaCarte, ["evenements", "newsletter"]);
    const f = facturePlateforme(3, { ...configPlateforme({}), forfait, parUtilisateur: 15 }, 1);
    expect(f.forfait).toBe(65.5);
    expect(f.sousTotal).toBe(95.5);
    // Rien de choisi, base à 0, pas de compte payant : gratuit
    expect(offreGratuite({ forfait: forfaitOffre({ ...aLaCarte, forfait: 0 }, []), parUtilisateur: 0 })).toBe(true);
    expect(offreGratuite({ forfait: forfaitOffre({ ...aLaCarte, forfait: 0 }, ["evenements"]), parUtilisateur: 0 })).toBe(false);
  });

  it("les fonctions ouvertes : à la carte, le choix de la Chambre ; sinon, celles de l'offre", () => {
    expect(fonctionsOuvertes(aLaCarte, ["newsletter", "messagerie"])).toEqual(["newsletter"]);
    expect(fonctionsOuvertes(aLaCarte, [])).toEqual([]);
    expect(fonctionsOuvertes({ fonctions: ["evenements"], surMesure: false }, [])).toEqual(["evenements"]);
    expect(libellesFonctions(["newsletter", "evenements"])).toBe("Événements, Newsletter");
  });
});
