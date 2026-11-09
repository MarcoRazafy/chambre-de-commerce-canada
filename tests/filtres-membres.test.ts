import { describe, expect, it } from "vitest";
import { dansOnglet } from "@/lib/filtres-membres";

describe("onglets de la liste des membres", () => {
  it("« Tous » compte les membres, pas les demandes ni les refus", () => {
    expect(dansOnglet("a_jour", "tous")).toBe(true);
    expect(dansOnglet("en_retard", "tous")).toBe(true);
    expect(dansOnglet("en_attente", "tous")).toBe(true);
    expect(dansOnglet("candidature", "tous")).toBe(false);
    expect(dansOnglet("refusee", "tous")).toBe(false);
  });

  it("les autres onglets gardent leur statut", () => {
    expect(dansOnglet("candidature", "candidature")).toBe(true);
    expect(dansOnglet("refusee", "refusee")).toBe(true);
    expect(dansOnglet("a_jour", "candidature")).toBe(false);
  });
});
