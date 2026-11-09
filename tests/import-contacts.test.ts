import { describe, expect, it } from "vitest";
import { devinerCorrespondance, ligneValide, lireCsv, preparerLignes } from "@/lib/import-contacts";

describe("import de contacts (CSV)", () => {
  it("lit un CSV au point-virgule, avec guillemets et BOM", () => {
    const { entetes, lignes } = lireCsv('﻿Société;Nom;E-mail;Tags\r\n"Bio; Sud";"Noro ""N"" R";noro@bio.mg;"VIP, Export"\r\n\r\n');
    expect(entetes).toEqual(["Société", "Nom", "E-mail", "Tags"]);
    expect(lignes).toEqual([["Bio; Sud", 'Noro "N" R', "noro@bio.mg", "VIP, Export"]]);
  });

  it("reconnaît la virgule comme séparateur", () => {
    expect(lireCsv("email,name\na@b.mg,Ando").lignes).toEqual([["a@b.mg", "Ando"]]);
  });

  it("devine les colonnes d'après les en-têtes, sans réutiliser une colonne", () => {
    const c = devinerCorrespondance(["Raison sociale", "Nom complet", "Courriel", "Poste", "Téléphone", "Notes"]);
    expect(c).toMatchObject({ entreprise: 0, nom: 1, email: 2, fonction: 3, tel: 4, secteur: -1, ville: -1, tags: -1 });
  });

  it("prépare les lignes et signale ce qui manque, les courriels invalides ou en double", () => {
    const c = devinerCorrespondance(["Entreprise", "Nom", "Email", "Tags"]);
    const r = preparerLignes(
      [
        ["Bio Sud", "Noro", "NORO@bio.mg", "VIP; Export | VIP"],
        ["", "Tahiry", "t@bio.mg", ""],
        ["Bio Sud", "X", "pas-un-mail", ""],
        ["Autre", "Y", "noro@bio.mg", ""],
      ],
      c,
    );
    expect(r[0]).toMatchObject({ numero: 2, erreur: null, ligne: { email: "noro@bio.mg", tags: ["VIP", "Export"] } });
    expect(r[1].erreur).toBe("Manque : entreprise");
    expect(r[2].erreur).toContain("n’est pas un courriel valide");
    expect(r[3].erreur).toContain("apparaît déjà");
  });

  it("revérifie côté serveur chaque ligne reçue", () => {
    expect(ligneValide({ entreprise: "A", nom: "B", email: "b@a.mg", tags: ["x", 3, "x"] })).toMatchObject({ tags: ["x"] });
    expect(ligneValide({ entreprise: "A", nom: "B", email: "faux" })).toBeNull();
    expect(ligneValide(null)).toBeNull();
  });
});
