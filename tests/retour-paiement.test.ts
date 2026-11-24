import { describe, expect, it } from "vitest";
import {
  destinationDuRetour,
  hoteLocal,
  marqueLocale,
  RELAIS_RETOUR,
  REPLI_RETOUR,
  versRelais,
} from "@/lib/retour-paiement";

describe("adresse du relais", () => {
  it("porte la page voulue, protégée", () => {
    const url = versRelais("/membre/cotisations/retour?ref=CC-2026-ABC123");
    expect(url.startsWith(`${RELAIS_RETOUR}?vers=`)).toBe(true);
    const vers = new URL(url, "https://exemple.mg").searchParams.get("vers");
    expect(vers).toBe("/membre/cotisations/retour?ref=CC-2026-ABC123");
  });

  it("accepte le billet de la page publique d'une Chambre, refuse un chemin détourné", () => {
    const chemin = "/c/ucan/evenements/e1/billet?code=CC-E1-PUB-AAAA&ref=CC-2026-XYZ";
    expect(destinationDuRetour(chemin)).toBe(chemin);
    expect(destinationDuRetour("/c/ucan/evenements/e1/../../../admin/billet?x=1")).toBe("/membre/cotisations");
    expect(destinationDuRetour("/c/UCAN!/evenements/e1/billet?code=X")).toBe("/membre/cotisations");
  });

  it("garde les paramètres d'un billet public", () => {
    const chemin = "/evenements/e1/billet?code=CC-E1-PUB-AAAA&ref=CC-2026-XYZ";
    const vers = new URL(
      versRelais(chemin),
      "https://exemple.mg",
    ).searchParams.get("vers");
    expect(destinationDuRetour(vers)).toBe(chemin);
  });
});

describe("retour vers un poste de développement", () => {
  it("désigne la machine locale par un repère, jamais par son nom", () => {
    expect(marqueLocale("localhost")).toBe("1");
    expect(marqueLocale("127.0.0.1")).toBe("2");
    for (const h of ["cancham.mg", "192.168.1.20", "localhost.evil.example"]) {
      expect(marqueLocale(h)).toBeNull();
    }
  });

  it("ne ramène que vers la machine locale", () => {
    expect(hoteLocal("1")).toBe("localhost");
    expect(hoteLocal("2")).toBe("127.0.0.1");
    for (const m of [null, undefined, "", "3", "evil.example", "localhost"]) {
      expect(hoteLocal(m)).toBeNull();
    }
  });

  it("garde l'adresse de retour sans le mot « localhost »", () => {
    const chemin = "/membre/cotisations/retour?ref=CC-2026-ABC123";
    const relais = versRelais(chemin, "1");
    expect(relais).not.toMatch(/localhost|127\.0\.0\.1/);
    const url = new URL(relais, "http://192.168.1.20:3000");
    expect(url.searchParams.get("local")).toBe("1");
    expect(destinationDuRetour(url.searchParams.get("vers"))).toBe(chemin);
    expect(versRelais(chemin)).not.toContain("local=");
  });
});

describe("destination du retour", () => {
  it("accepte les deux pages de retour", () => {
    for (const v of [
      "/membre/cotisations/retour?ref=CC-2026-ABC123",
      "/evenements/e1/billet?code=X&ref=Y",
    ]) {
      expect(destinationDuRetour(v)).toBe(v);
    }
  });

  it("se replie devant tout le reste", () => {
    for (const v of [
      null,
      undefined,
      "",
      "https://evil.example/",
      "//evil.example/membre/cotisations/retour?ref=x",
      "/\\evil.example",
      "/admin",
      "/membre/profil",
      "/membre/cotisations/retour",
      "/evenements/e1/../../admin/billet?x=1",
      "/evenements/e1/billet",
      "/membre/cotisations/retour?ref=x\nLocation: https://evil.example",
      "javascript:alert(1)",
      "/membre/cotisations/retour?ref=€",
      "/membre/cotisations/retour?ref=\0",
      "/evenements/../billet?x=1",
      "/evenements/%2e%2e/billet?x=1",
    ]) {
      expect(destinationDuRetour(v)).toBe(REPLI_RETOUR);
    }
  });
});
