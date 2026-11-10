import { describe, expect, it } from "vitest";
import { ajouterTags, lireTags, tagsSelonRegles } from "@/lib/tags";

describe("tags", () => {
  it("nettoie une saisie : espaces, vides, doublons, longueur", () => {
    expect(lireTags(["  VIP   gala ", "", "VIP gala", 3, "x".repeat(70)])).toEqual(["VIP gala", "x".repeat(60)]);
  });

  it("ajoute sans doublon, et dit quand rien ne change", () => {
    expect(ajouterTags(["A"], ["A", "B"])).toEqual(["A", "B"]);
    expect(ajouterTags(["A", "B"], ["B"])).toBeNull();
  });
});

describe("tags automatiques", () => {
  const regles = [
    { statut: "a_jour", tag: "Membre à jour", actif: true },
    { statut: "en_retard", tag: "Relance", actif: true },
    { statut: "en_retard", tag: "Ancienne règle", actif: false },
  ];

  it("pose le tag de la situation et garde les tags posés à la main", () => {
    expect(tagsSelonRegles(["VIP"], "a_jour", regles)).toEqual(["VIP", "Membre à jour"]);
  });

  it("retire le tag quand l'entreprise n'est plus dans la situation", () => {
    expect(tagsSelonRegles(["VIP", "Membre à jour"], "en_retard", regles)).toEqual(["VIP", "Relance"]);
  });

  it("ne change rien quand tout est déjà juste, et ignore les règles désactivées", () => {
    expect(tagsSelonRegles(["Membre à jour"], "a_jour", regles)).toBeNull();
    expect(tagsSelonRegles(["Ancienne règle"], "a_jour", regles)).toEqual(["Ancienne règle", "Membre à jour"]);
  });
});
