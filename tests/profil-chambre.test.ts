import { describe, expect, it } from "vitest";
import { adresseSurUneLigne, completerProfil, NOM_CHAMBRE, numerosFiscaux } from "@/lib/profil-chambre-defauts";
import { COORDONNEES } from "@/lib/coordonnees";

describe("profil de la Chambre", () => {
  it("reprend les valeurs par défaut tant que rien n'est rempli", () => {
    const p = completerProfil(null);
    expect(p).toMatchObject({ nom: NOM_CHAMBRE, raisonSociale: NOM_CHAMBRE, email: COORDONNEES.email, logo: "/marque/logo-couleur.png" });
  });

  it("la facturation suit la Chambre, sauf ce qui est précisé", () => {
    const p = completerProfil({ nom: "IMPACT 261", adresse: "Montréal", logo: "/televersements/l.png", raisonSociale: "  ", neq: "1234567890", tps: "123456789 RT0001" });
    expect(p).toMatchObject({ raisonSociale: "IMPACT 261", adresseFacturation: "Montréal", logo: "/televersements/l.png" });
    expect(numerosFiscaux(p)).toEqual(["NEQ : 1234567890", "TPS : 123456789 RT0001"]);
  });

  it("compose l'adresse à partir de ses parties : une ligne, et une ligne par partie sur les factures", () => {
    const p = completerProfil({ adresseRue: "12 rue des Lilas", ville: "Montréal", province: "QC", codePostal: "H2X 1Y4", pays: "Canada" });
    expect(p.adresse).toBe("12 rue des Lilas, Montréal, QC H2X 1Y4, Canada");
    expect(p.adresseFacturation).toBe("12 rue des Lilas\nMontréal, QC H2X 1Y4\nCanada");
    // Sans province : « Ville, Code postal »
    expect(adresseSurUneLigne({ adresseRue: "Lot 70", ville: "Antananarivo", codePostal: "101", pays: "Madagascar" })).toBe("Lot 70, Antananarivo, 101, Madagascar");
    expect(adresseSurUneLigne({ ville: "Montréal", pays: "Canada" })).toBe("Montréal, Canada");
    // Ancienne adresse d'un seul tenant, sans parties : elle reste telle quelle
    expect(completerProfil({ adresse: "Antananarivo" }).adresse).toBe("Antananarivo");
  });
});
