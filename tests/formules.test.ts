import { describe, expect, it } from "vitest";
import { themesDeLaChambre } from "@/lib/aide";
import { cotisationAnnuelle, fmtCotisation, libelleFormule, type Formule } from "@/lib/membership";

const entreprise: Formule = { id: "f1", pays: "Madagascar", profil: "Entreprise", montant: 500000, devise: "MGA" };
const canada: Formule = { id: "f2", pays: "Canada", profil: "Entreprise canadienne", montant: 300, devise: "CAD" };

describe("formules d'adhésion de la Chambre", () => {
  it("s'affichent d'après la formule elle-même", () => {
    expect(libelleFormule(entreprise)).toBe("Madagascar — Entreprise");
    expect(fmtCotisation(entreprise)).toMatch(/^500\s000 Ar$/);
    expect(fmtCotisation(canada)).toBe("300 $");
    expect(cotisationAnnuelle(canada)).toBe("300 $ / an");
    expect(libelleFormule(null)).toBe("Formule à choisir");
    expect(fmtCotisation(null)).toBe("à définir");
    expect(cotisationAnnuelle(null)).toBe("Cotisation à définir");
  });

  it("l'aide montre la grille de la Chambre", () => {
    const reponse = (formules: Formule[]) =>
      themesDeLaChambre(formules).flatMap((t) => t.questions).find((q) => q.id === "formules")!.reponse;
    expect(reponse([entreprise, canada])).toContain("· Madagascar — Entreprise : ");
    expect(reponse([entreprise, canada])).toContain("· Canada — Entreprise canadienne : 300 $ par an");
    expect(reponse([])).not.toContain("{{");
  });
});
