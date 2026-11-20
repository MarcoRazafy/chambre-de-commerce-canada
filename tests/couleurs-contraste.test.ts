import { describe, expect, test } from "vitest";
import { BLANC, contraste, CONTRASTE_MIN, nuanceLisible, texteLisible, TEXTE_FONCE } from "@/lib/couleurs";

describe("contraste des couleurs", () => {
  test("ratio WCAG", () => {
    expect(contraste("#ffffff", "#000000")).toBeCloseTo(21, 0);
    expect(contraste("#ad0707", BLANC)).toBeGreaterThan(CONTRASTE_MIN);
    expect(contraste("#f97316", BLANC)).toBeLessThan(CONTRASTE_MIN);
  });
  test("nuance lisible proposée", () => {
    const c = nuanceLisible("#f97316");
    expect(contraste(c, BLANC)).toBeGreaterThanOrEqual(CONTRASTE_MIN);
    expect(contraste(nuanceLisible("#cccccc", "#ffffff"), "#ffffff")).toBeGreaterThanOrEqual(CONTRASTE_MIN);
  });
  test("texte le plus lisible", () => {
    expect(texteLisible("#0f1d2c")).toBe(BLANC);
    expect(texteLisible("#f1f4f7")).toBe(TEXTE_FONCE);
  });
});
