import { describe, expect, it } from "vitest";
import { COORDONNEES } from "@/lib/coordonnees";
import { completerProfil } from "@/lib/profil-chambre-defauts";

describe("profil d'une Chambre : valeurs par défaut", () => {
  it("la Chambre n° 1 reprend les coordonnées par défaut pour un champ vide", () => {
    const p = completerProfil({ chambreId: "principale", nom: "", telephone: "" });
    expect(p.telephone).toBe(COORDONNEES.telephone);
    expect(p.email).toBe(COORDONNEES.email);
  });

  it("une autre Chambre ne reçoit jamais les coordonnées d'une autre : champ vide", () => {
    const p = completerProfil({ chambreId: "c-autre", nom: "Chambre Autre", email: "contact@autre.org", telephone: "" });
    expect(p.nom).toBe("Chambre Autre");
    expect(p.email).toBe("contact@autre.org");
    expect(p.telephone).toBe("");
    expect(p.site).toBe("");
    expect(p.adresse).toBe("");
    expect(p.raisonSociale).toBe("Chambre Autre");
  });
});
