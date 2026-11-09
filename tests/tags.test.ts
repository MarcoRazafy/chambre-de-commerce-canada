import { describe, expect, it } from "vitest";
import { ajouterTags, lireTags } from "@/lib/tags";

describe("tags", () => {
  it("nettoie une saisie : espaces, vides, doublons, longueur", () => {
    expect(lireTags(["  VIP   gala ", "", "VIP gala", 3, "x".repeat(70)])).toEqual(["VIP gala", "x".repeat(60)]);
  });

  it("ajoute sans doublon, et dit quand rien ne change", () => {
    expect(ajouterTags(["A"], ["A", "B"])).toEqual(["A", "B"]);
    expect(ajouterTags(["A", "B"], ["B"])).toBeNull();
  });
});
