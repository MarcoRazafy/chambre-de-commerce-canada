import { describe, expect, it } from "vitest";
import { nettoyerPrefixe, prefixeParDefaut } from "@/lib/prefixe-numeros-base";

describe("préfixe des numéros", () => {
  it("CanCham garde CC, les autres Chambres prennent leurs initiales", () => {
    expect(prefixeParDefaut("Chambre de Commerce et de Coopération Canada–Madagascar", true)).toBe("CC");
    expect(prefixeParDefaut("Ucan Make It Happen", false)).toBe("UMIH");
    expect(prefixeParDefaut("Événements Québec", false)).toBe("EQ");
    expect(prefixeParDefaut("Ucan", false)).toBe("UCA");
    expect(prefixeParDefaut("", false)).toBe("FA");
  });
  it("une saisie est mise en majuscules, sans accents ni symboles, 5 caractères au plus", () => {
    expect(nettoyerPrefixe(" uc-é ")).toBe("UCE");
    expect(nettoyerPrefixe("abcdefgh")).toBe("ABCDE");
  });
});
