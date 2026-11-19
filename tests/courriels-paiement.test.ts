import { describe, expect, it } from "vitest";
import { courrielAbonnementPaye, courrielPaiementEquipe, courrielPaiementRecu } from "@/lib/modeles-courriels";

describe("courriels de paiement", () => {
  it("reçu au membre : la Chambre, le montant, le moyen, l'objet, la facture et son lien", () => {
    const c = courrielPaiementRecu("m@x.mg", { nom: "Tojo Rabe", chambre: "Ucan", objet: "Cotisation annuelle 2026", numero: "CC-2026-0415", montant: "150 $", moyen: "Carte bancaire", lien: "https://client.x/membre/cotisations/f1" });
    expect(c.a).toBe("m@x.mg");
    expect(c.sujet).toBe("Paiement reçu — facture CC-2026-0415");
    expect(c.texte).toContain("Bonjour Tojo,");
    expect(c.texte).toContain("Ucan a bien reçu votre paiement de 150 $ (carte bancaire) pour « Cotisation annuelle 2026 »");
    expect(c.html).toContain("https://client.x/membre/cotisations/f1");
    expect(c.dePlateforme).toBeUndefined();
  });

  it("alerte à l'équipe : qui a payé, et la facture quand il y en a une", () => {
    const avec = courrielPaiementEquipe("equipe@x.mg", { qui: "Sahanala Agro", objet: "Cotisation", numero: "CC-1", montant: "150 $", moyen: "Carte bancaire", lien: "https://dev.x/admin/paiements/f1" });
    expect(avec.sujet).toBe("Paiement en ligne : Sahanala Agro");
    expect(avec.texte).toContain("facture CC-1");
    const sans = courrielPaiementEquipe("equipe@x.mg", { qui: "Une inscription publique", objet: "Inscription : Gala", numero: null, montant: "36 $", moyen: "Carte bancaire", lien: "https://dev.x/admin/reglements" });
    expect(sans.texte).not.toContain("facture");
    expect(sans.html).toContain("Voir les règlements");
  });

  it("reçu de l'abonnement : envoyé au nom de la plateforme", () => {
    const c = courrielAbonnementPaye("admin@x.mg", { nom: "Ando R", numero: "PLT-2026-11", montant: "132,22 $", lien: "https://dev.x/admin/abonnement/factures/PLT-2026-11" });
    expect(c.dePlateforme).toBe(true);
    expect(c.sujet).toBe("Paiement reçu — facture PLT-2026-11");
    expect(c.texte).toContain("débitée de 132,22 $");
  });
});
