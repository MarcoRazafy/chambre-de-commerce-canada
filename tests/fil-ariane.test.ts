import { describe, expect, it } from "vitest";
import { filPour } from "@/lib/nav";

const libelles = (chemin: string, racine = "/admin") => filPour(chemin, racine).map((m) => m.libelle);

describe("fil d'Ariane", () => {
  it("à l'accueil : l'espace puis la page, sans lien vers soi-même", () => {
    expect(filPour("/admin", "/admin")).toEqual([
      { libelle: "Back-office", href: null },
      { libelle: "Tableau de bord", href: null },
    ]);
  });

  it("une page de premier niveau : l'espace en lien, la page en cours", () => {
    expect(filPour("/admin/membres", "/admin")).toEqual([
      { libelle: "Back-office", href: "/admin" },
      { libelle: "Membres", href: null },
    ]);
  });

  it("une page connue sous une autre : le parent devient un lien", () => {
    expect(filPour("/admin/newsletter/nouvelle", "/admin")).toEqual([
      { libelle: "Back-office", href: "/admin" },
      { libelle: "Newsletter", href: "/admin/newsletter" },
      { libelle: "Nouvelle lettre", href: null },
    ]);
  });

  it("une fiche et ses sous-pages", () => {
    expect(libelles("/admin/membres/abc")).toEqual(["Back-office", "Membres", "Fiche du membre"]);
    expect(filPour("/admin/evenements/e1/modifier", "/admin")).toEqual([
      { libelle: "Back-office", href: "/admin" },
      { libelle: "Événements", href: "/admin/evenements" },
      { libelle: "Événement", href: "/admin/evenements/e1" },
      { libelle: "Modifier", href: null },
    ]);
    expect(libelles("/admin/rendez-vous/apercu")).toEqual(["Back-office", "Rendez-vous", "Aperçu"]);
  });

  it("l'espace membre, y compris les niveaux intermédiaires connus", () => {
    expect(libelles("/membre/cotisations/payer/p1", "/membre")).toEqual(["Espace membre", "Cotisations & factures", "Régler", "Règlement"]);
    expect(libelles("/membre", "/membre")).toEqual(["Espace membre", "Vue d’ensemble"]);
  });

  it("un détail porté par l'adresse (un tag ouvert)", () => {
    expect(filPour("/admin/etiquettes", "/admin", new URLSearchParams("e=VIP gala 2026"))).toEqual([
      { libelle: "Back-office", href: "/admin" },
      { libelle: "Tags", href: "/admin/etiquettes" },
      { libelle: "VIP gala 2026", href: null },
    ]);
    expect(libelles("/admin/membres")).toEqual(["Back-office", "Membres"]);
  });
});
