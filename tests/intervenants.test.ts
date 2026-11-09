import { describe, expect, it } from "vitest";
import { INTERVENANTS_MAX, lireIntervenants } from "@/lib/intervenants";

const vide = { noms: [], fonctions: [], entreprises: [], bios: [], actuelles: [], nouvelles: [], retirees: [] };

describe("intervenants d'un événement", () => {
  it("gardent l'ordre de saisie et ignorent les lignes sans nom", () => {
    const l = lireIntervenants({
      ...vide,
      noms: ["Hanta Rasoa", "  ", "Marc Gagnon"],
      fonctions: ["Conseillère", "", "Associé"],
      entreprises: ["", "", "Laurentides Capital"],
      bios: ["", "", ""],
      actuelles: ["", "", ""],
      nouvelles: [null, null, null],
      retirees: [false, false, false],
    });
    expect(l).toEqual([
      { nom: "Hanta Rasoa", fonction: "Conseillère", entreprise: null, bio: null, photo: null, ordre: 0 },
      { nom: "Marc Gagnon", fonction: "Associé", entreprise: "Laurentides Capital", bio: null, photo: null, ordre: 1 },
    ]);
  });

  it("prennent la nouvelle photo, sinon gardent l'actuelle, sauf si elle est retirée", () => {
    const l = lireIntervenants({
      ...vide,
      noms: ["A", "B", "C"],
      actuelles: ["/televersements/a.jpg", "/televersements/b.jpg", "/televersements/c.jpg"],
      nouvelles: ["/televersements/nouvelle.jpg", null, null],
      retirees: [false, false, true],
    });
    expect(l.map((p) => p.photo)).toEqual(["/televersements/nouvelle.jpg", "/televersements/b.jpg", null]);
  });

  it("écartent une « photo actuelle » qui ne vient pas de nos téléversements", () => {
    const l = lireIntervenants({ ...vide, noms: ["A"], actuelles: ["https://exemple.com/x.jpg"], nouvelles: [null], retirees: [false] });
    expect(l[0].photo).toBeNull();
  });

  it("nettoient les espaces et limitent leur nombre", () => {
    const noms = Array.from({ length: INTERVENANTS_MAX + 5 }, (_, i) => `  Intervenant   ${i}  `);
    const l = lireIntervenants({ ...vide, noms, nouvelles: noms.map(() => null), retirees: noms.map(() => false) });
    expect(l).toHaveLength(INTERVENANTS_MAX);
    expect(l[0].nom).toBe("Intervenant 0");
  });
});
