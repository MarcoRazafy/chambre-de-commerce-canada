import { describe, expect, it } from "vitest";
import { couleur, cssCouleurs, nuance, tropClaire } from "@/lib/couleurs";

const VIDE = { principale: null, laterale: null, laterale2: null, haut: null, connexion: null };

describe("couleurs d'une Chambre", () => {
  it("n'accepte que « #rrggbb » (rien d'autre ne passe dans le CSS)", () => {
    expect(couleur("#0F1D2C")).toBe("#0f1d2c");
    for (const x of ["red", "#fff", "#0f1d2c;}body{display:none", "url(x)", "", null]) expect(couleur(x)).toBeNull();
  });

  it("éclaircit et assombrit", () => {
    expect(nuance("#808080", 1)).toBe("#ffffff");
    expect(nuance("#808080", -1)).toBe("#000000");
    expect(nuance("#000000", 0.5)).toBe("#808080");
  });

  it("repère les couleurs trop claires pour un texte blanc", () => {
    expect(tropClaire("#ffffff")).toBe(true);
    expect(tropClaire("#f1f5f9")).toBe(true);
    expect(tropClaire("#0f1d2c")).toBe(false);
    expect(tropClaire("#ad0707")).toBe(false);
  });

  it("rien de réglé : aucun CSS", () => {
    expect(cssCouleurs(VIDE)).toBe("");
  });

  it("pose seulement les variables réglées, sur les espaces de la Chambre", () => {
    const css = cssCouleurs({ ...VIDE, principale: "#1d4ed8", laterale: "#111111", laterale2: "#333333", haut: "#222222" });
    expect(css.startsWith("html :is(.espace-admin,.espace-membre,.cadre-auth){")).toBe(true);
    expect(css).toContain("--accent:#1d4ed8");
    expect(css).toContain("--marque-rouge:#1d4ed8");
    expect(css).toContain("--laterale:linear-gradient(180deg,#111111 0%,#333333 100%)");
    expect(css).toContain("--superieure:#222222");
    expect(css).not.toContain("--connexion");
  });

  it("une valeur malveillante est ignorée", () => {
    expect(cssCouleurs({ ...VIDE, principale: "#000000}body{background:red" })).toBe("");
  });

  it("barre latérale d'une seule couleur", () => {
    expect(cssCouleurs({ ...VIDE, laterale: "#123456" })).toContain("--laterale:#123456");
  });
});
