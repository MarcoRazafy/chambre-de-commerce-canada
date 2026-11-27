import { describe, expect, it } from "vitest";
import {
  codeInscription,
  codeRepresentant,
  estCodeInscription,
  extraireCode,
} from "@/lib/codes-accueil";

describe("codes d'accueil", () => {
  it("donne au premier représentant le code de l'inscription, aux suivants leur rang", () => {
    expect(codeRepresentant("CC-VOPA-K7Q2PX", 0)).toBe("CC-VOPA-K7Q2PX");
    expect(codeRepresentant("CC-VOPA-K7Q2PX", 1)).toBe("CC-VOPA-K7Q2PX-2");
    expect(codeRepresentant("CC-VOPA-K7Q2PX", 9)).toBe("CC-VOPA-K7Q2PX-10");
  });

  it("lit le rang d'un représentant sans le couper", () => {
    expect(extraireCode("CC-VOPA-K7Q2PX-2")).toBe("CC-VOPA-K7Q2PX-2");
    expect(extraireCode("CC-VOPA-K7Q2PX-10")).toBe("CC-VOPA-K7Q2PX-10");
  });

  it("lit toujours les anciens codes, même au milieu d'un texte", () => {
    expect(extraireCode("CC-E2-4718")).toBe("CC-E2-4718");
    expect(extraireCode("Billet : cc-e2-4718 · merci")).toBe("CC-E2-4718");
    expect(extraireCode("https://x.mg/?c=CC-VOPA-K7Q2PX-3&r=1")).toBe(
      "CC-VOPA-K7Q2PX-3",
    );
  });

  it("rend la saisie telle quelle quand rien ne ressemble à un code", () => {
    expect(extraireCode("  inconnu ")).toBe("inconnu");
  });

  it("reconnaît un code d'inscription entier", () => {
    for (const c of ["CC-VOPA-K7Q2PX", "CC-E2-4718", "CC-PUB1-CRWU3H", "UMIH-VOPA-K7Q2PX"]) {
      expect(estCodeInscription(c)).toBe(true);
    }
  });

  it("refuse un code tronqué, qui désignerait toutes les inscriptions", () => {
    for (const c of [
      "",
      "CC",
      "CC-",
      "CC-VOPA",
      "CC-VOPA-",
      "CC-VOPA-K7",
      "CC-VOPA-K7Q2PX-2",
      "cc-vopa-k7q2px",
      "CC-VOPA-K7Q2PX%",
      "X-VOPA-K7Q2PX",
      "TROPLONG-VOPA-K7Q2PX",
    ]) {
      expect(estCodeInscription(c)).toBe(false);
    }
  });

  it("ramène le code d'un représentant à celui de l'inscription", () => {
    expect(codeInscription("CC-VOPA-K7Q2PX-3")).toBe("CC-VOPA-K7Q2PX");
    expect(estCodeInscription(codeInscription(extraireCode("CC")))).toBe(false);
  });
});
