import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/chambre-courante", async (orig) => ({
  ...(await orig<typeof import("@/lib/chambre-courante")>()),
  resoudreHote: async () => ({ id: null, propre: true, partage: null, suspendue: false, restriction: null, accesDev: false, fonctions: null, paiementAttendu: false }),
}));

const { default: proxy } = await import("@/proxy");

describe("redirection vers HTTPS", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("renvoie une requête HTTP vers HTTPS en production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const r = await proxy(new NextRequest("http://www.exemple.com/tarifs?a=1", { headers: { host: "www.exemple.com", "x-forwarded-proto": "http" } }));
    expect(r.status).toBe(308);
    expect(r.headers.get("location")).toBe("https://www.exemple.com/tarifs?a=1");
  });

  it("laisse passer la requête interne de l'optimiseur d'images", async () => {
    vi.stubEnv("NODE_ENV", "production");
    for (const host of ["0.0.0.0", "0.0.0.0:3000", "localhost:3000", "10.0.0.5:3000"]) {
      const r = await proxy(new NextRequest(`http://${host}/tarifs`, { headers: { host, "x-forwarded-host": host, "x-forwarded-proto": "http" } }));
      expect(r.status, host).not.toBe(308);
    }
    const f = await proxy(new NextRequest("http://www.exemple.com/logos/m1.png", { headers: { host: "www.exemple.com", "x-forwarded-proto": "http" } }));
    expect(f.status).not.toBe(308);
  });

  it("ne touche pas une requête déjà en HTTPS", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DOMAINE_PLATEFORME", "exemple.com");
    const r = await proxy(new NextRequest("https://www.exemple.com/tarifs", { headers: { host: "www.exemple.com", "x-forwarded-proto": "https" } }));
    expect(r.headers.get("location") ?? "").not.toMatch(/^https:\/\/www\.exemple\.com\/tarifs$/);
    expect(r.status).not.toBe(308);
  });
});
