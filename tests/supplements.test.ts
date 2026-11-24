import { describe, expect, it } from "vitest";
import { libelleSupplement, lireSupplementsSaisis, supplementsChoisis, totalSupplements } from "@/lib/supplements";

const saisie = (lignes: [string, string][]) => {
  const fd = new FormData();
  for (const [l, p] of lignes) {
    fd.append("supplementLibelle", l);
    fd.append("supplementPrix", p);
  }
  return fd;
};

describe("autres paiements d'un événement", () => {
  it("lit les lignes saisies, ignore les lignes vides, garde l'ordre", () => {
    expect(lireSupplementsSaisis(saisie([["Dîner de gala", "20"], ["", ""], ["  Atelier   pratique ", "30"]]))).toEqual([
      { libelle: "Dîner de gala", prix: 20, ordre: 0 },
      { libelle: "Atelier pratique", prix: 30, ordre: 1 },
    ]);
  });

  it("refuse une ligne sans nom ou sans prix valable", () => {
    expect(lireSupplementsSaisis(saisie([["", "20"]]))).toMatch(/Donnez un nom/);
    expect(lireSupplementsSaisis(saisie([["Dîner", "0"]]))).toMatch(/prix de « Dîner »/);
    expect(lireSupplementsSaisis(saisie([["Dîner", "12.5"]]))).toMatch(/prix de « Dîner »/);
  });

  it("ne retient que les choix proposés par l'événement", () => {
    const proposes = [{ id: "a", libelle: "Dîner", prix: 20 }, { id: "b", libelle: "Atelier", prix: 30 }];
    const choisis = supplementsChoisis(proposes, ["b", "z", "b"]);
    expect(choisis).toEqual([{ id: "b", libelle: "Atelier", prix: 30 }]);
    expect(totalSupplements(proposes)).toBe(50);
    expect(libelleSupplement(proposes[0])).toMatch(/^Dîner \(20\s?\$\)$/);
  });
});
