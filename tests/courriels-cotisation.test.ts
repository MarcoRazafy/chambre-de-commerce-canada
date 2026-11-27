import { describe, expect, it } from "vitest";
import {
  courrielDemandeApprouvee,
  courrielRelanceCotisation,
} from "@/lib/modeles-courriels";

const validation = (enLigne: boolean) =>
  courrielDemandeApprouvee("marie@exemple.mg", {
    nom: "Marie Rakoto",
    entreprise: "Bio Sud Essences",
    formule: "Madagascar — Entreprise",
    montant: "500 000 Ar",
    enLigne,
    lien: "https://cancham.mg/auth/nouveau-mot-de-passe?jeton=abc",
    creerMotDePasse: true,
  });

const relance = (enLigne: boolean) =>
  courrielRelanceCotisation("marie@exemple.mg", {
    nom: "Marie Rakoto",
    entreprise: "Bio Sud Essences",
    formule: "Madagascar — Entreprise",
    montant: "500 000 Ar",
    retardJours: null,
    enLigne,
    lien: "https://cancham.mg/membre/cotisations",
  });

describe("courriels de cotisation", () => {
  it("annonce le paiement en ligne quand la cotisation s’y règle", () => {
    const { texte } = validation(true);
    expect(texte).toContain("500 000 Ar");
    expect(texte).toContain("en ligne depuis votre espace");
    expect(texte).not.toContain("mobile money");
    expect(relance(true).texte).toContain("Régler ma cotisation");
    expect(relance(true).texte).toContain("en ligne depuis votre espace membre");
    expect(relance(true).texte).not.toContain("mobile money");
  });

  it("renvoie vers l’équipe quand elle ne se règle pas en ligne", () => {
    const { texte } = validation(false);
    expect(texte).toContain("auprès de l’équipe");
    expect(texte).not.toContain("mobile money");
    expect(relance(false).texte).not.toContain("mobile money");
    expect(relance(false).texte).toContain("Voir mes cotisations");
  });
});
