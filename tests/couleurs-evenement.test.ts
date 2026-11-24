import { describe, expect, it } from "vitest";
import { stylePagePublique } from "@/lib/couleurs-evenement";

const vide = { haut: null, pied: null, pied2: null };

describe("couleurs de la page publique d'un événement", () => {
  it("par défaut : barre bleu nuit, pied de page en dégradé, textes clairs", () => {
    const s = stylePagePublique(null, vide);
    expect(s.fondHaut).toContain("#0f1d2c");
    expect(s.fondPied).toMatch(/^linear-gradient\(100deg,#a3122a.*#007140 100%\)$/);
    expect(s.hautSombre).toBe(true);
    expect(s.piedSombre).toBe(true);
    expect(s.boutonClair).toBe(false);
  });

  it("reprend les couleurs de la Chambre quand l'événement n'en a pas", () => {
    const s = stylePagePublique(vide, { haut: "#052e16", pied: "#065f46", pied2: "#022c22" });
    expect(s.fondHaut).toBe("#052e16");
    expect(s.fondPied).toBe("linear-gradient(100deg,#065f46 0%,#022c22 100%)");
  });

  it("les couleurs de l'événement passent avant celles de la Chambre", () => {
    const s = stylePagePublique({ haut: "#ffffff", pied: "#f1f4f7", pied2: null }, { haut: "#052e16", pied: "#065f46", pied2: "#022c22" });
    expect(s.fondHaut).toBe("#ffffff");
    expect(s.hautSombre).toBe(false);
    expect(s.fondPied).toBe("#f1f4f7");
    expect(s.piedSombre).toBe(false);
  });

  it("bouton blanc quand la barre est trop proche du rouge du bouton", () => {
    expect(stylePagePublique({ haut: "#1d4ed8", pied: null, pied2: null }, vide).boutonClair).toBe(true);
    expect(stylePagePublique({ haut: "#0f1d2c", pied: null, pied2: null }, vide).boutonClair).toBe(false);
  });

  it("ignore une couleur invalide", () => {
    expect(stylePagePublique({ haut: "rouge", pied: "", pied2: "" }, vide).fondHaut).toContain("#0f1d2c");
  });
});
