import { afterEach, describe, expect, it, vi } from "vitest";
import { lireSession, signer } from "@/lib/auth";
import { lienEntree, lireLienEntree, lireVisite } from "@/lib/visite-gm";

afterEach(() => vi.useRealTimers());

describe("mode développeur : liens et visites de l'Admin GM", () => {
  const e = { c: "chambre-a", u: "u-super", g: "gm-1", n: "Marie GM" };

  it("le lien d'entrée se lit tel quel, deux minutes au plus", () => {
    vi.useFakeTimers({ now: new Date("2026-11-20T10:00:00Z") });
    const jeton = lienEntree(e);
    expect(lireLienEntree(jeton)).toMatchObject(e);
    vi.setSystemTime(new Date("2026-11-20T10:03:00Z"));
    expect(lireLienEntree(jeton)).toBeNull();
  });

  it("modifié, ou servi comme cookie de visite : refusé", () => {
    const jeton = lienEntree(e);
    const [charge, signature] = jeton.split(".");
    const autre = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(charge, "base64url").toString()), c: "chambre-b" })).toString("base64url");
    expect(lireLienEntree(`${autre}.${signature}`)).toBeNull();
    expect(lireLienEntree("n'importe.quoi")).toBeNull();
    // Même signature, autre usage : un lien d'entrée n'est pas une visite
    expect(lireVisite(jeton)).toBeNull();
  });

  it("une session de visite est reconnue comme telle", () => {
    const fin = Date.now() + 3_600_000;
    const ordinaire = `u-1.${fin}`;
    const visite = `u-1.${fin}.v`;
    expect(lireSession(`${ordinaire}.${signer(ordinaire)}`)?.visite).toBe(false);
    expect(lireSession(`${visite}.${signer(visite)}`)?.visite).toBe(true);
    // Retirer la marque de visite casse la signature
    expect(lireSession(`${ordinaire}.${signer(visite)}`)).toBeNull();
  });
});
