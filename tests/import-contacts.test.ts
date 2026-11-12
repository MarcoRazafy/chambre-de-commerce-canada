import { describe, expect, it } from "vitest";
import { devinerCorrespondance, ligneValide, lireCsv, normaliserEmail, preparerLignes, nomComplet } from "@/lib/import-contacts";

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

  it("prépare les lignes et signale ce qui manque ou les courriels invalides", () => {
    const c = devinerCorrespondance(["Entreprise", "Nom", "Email", "Tags"]);
    const r = preparerLignes(
      [
        ["Bio Sud", "Noro", "NORO@bio.mg", "VIP; Export | VIP"],
        ["", "Tahiry", "t@bio.mg", ""],
        ["Bio Sud", "X", "pas-un-mail", ""],
      ],
      c,
    );
    expect(r[0]).toMatchObject({ numero: 2, erreur: null, fusion: null, ligne: { email: "noro@bio.mg", tags: ["VIP", "Export"] } });
    // Sans entreprise : la ligne est valable, le contact ira dans « Sans entreprise »
    expect(r[1]).toMatchObject({ erreur: null, ligne: { entreprise: "", nom: "Tahiry", email: "t@bio.mg" } });
    expect(r[2].erreur).toContain("n’est pas un courriel valide");
  });

  it("reconnaît Prénom et Nom séparés, et compose le nom affiché", () => {
    const c = devinerCorrespondance(["Email", "Nom", "Prénom"]);
    expect(c).toMatchObject({ email: 0, nom: 1, prenom: 2, entreprise: -1 });
    const [l] = preparerLignes([["marina@x.mg", "Sama", "Marina"]], c);
    expect(l.erreur).toBeNull();
    expect(nomComplet(l.ligne!)).toBe("Marina Sama");
    expect(nomComplet({ prenom: "", nom: "", email: "solo@x.mg" })).toBe("solo");
    expect(preparerLignes([["", "Sama", "Marina"]], c)[0].erreur).toBe("Manque : courriel");
  });

  it("réunit les lignes au même courriel en un seul contact", () => {
    const c = devinerCorrespondance(["Entreprise", "Nom", "Email", "Téléphone", "Tags"]);
    const r = preparerLignes(
      [
        ["Bio Sud", "Noro", "Noro@Bio.mg", "", "VIP"],
        ["Fandresena", "Fetra", "fetra@f.mg", "", ""],
        ["Autre SA", "", " mailto:noro@bio.mg ", "+261 34 00", "Export, VIP"],
        ["", "Tahiry", "t@bio.mg", "", ""],
        ["Bio Sud", "", "<T@BIO.MG>", "", ""],
      ],
      c,
    );
    expect(r).toHaveLength(3);
    expect(r[0]).toMatchObject({
      numero: 2,
      erreur: null,
      ligne: { entreprise: "Bio Sud", nom: "Noro", email: "noro@bio.mg", tel: "+261 34 00", tags: ["VIP", "Export"] },
      fusion: { numeros: [2, 4], ecarts: ["entreprise « Autre SA » (ligne 4)"] },
    });
    expect(r[1].fusion).toBeNull();
    // Une ligne incomplète est sauvée par son double
    expect(r[2]).toMatchObject({ numero: 5, erreur: null, ligne: { entreprise: "Bio Sud", nom: "Tahiry", email: "t@bio.mg" }, fusion: { numeros: [5, 6] } });
  });

  it("nettoie les adresses avant de les comparer", () => {
    expect(normaliserEmail(" Mailto:Noro@Bio.MG ")).toBe("noro@bio.mg");
    expect(normaliserEmail("<noro @bio.mg>")).toBe("noro@bio.mg");
  });

  it("revérifie côté serveur chaque ligne reçue", () => {
    expect(ligneValide({ entreprise: "A", nom: "B", email: "b@a.mg", tags: ["x", 3, "x"] })).toMatchObject({ tags: ["x"] });
    expect(ligneValide({ entreprise: "A", nom: "B", email: "faux" })).toBeNull();
    expect(ligneValide(null)).toBeNull();
  });
});
