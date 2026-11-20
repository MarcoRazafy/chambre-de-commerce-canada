import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { default: proxy } = await import("@/proxy");

describe("redirection vers HTTPS", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("renvoie une requête HTTP vers HTTPS en production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const r = await proxy(new NextRequest("http://www.exemple.com/tarifs?a=1", { headers: { host: "www.exemple.com", "x-forwarded-proto": "http" } }));
    expect(r.status).toBe(308);
    expect(r.headers.get("location")).toBe("https://www.exemple.com/tarifs?a=1");
  });

  it("ne touche pas une requête déjà en HTTPS", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DOMAINE_PLATEFORME", "exemple.com");
    const r = await proxy(new NextRequest("https://www.exemple.com/tarifs", { headers: { host: "www.exemple.com", "x-forwarded-proto": "https" } }));
    expect(r.headers.get("location") ?? "").not.toMatch(/^https:\/\/www\.exemple\.com\/tarifs$/);
    expect(r.status).not.toBe(308);
  });
});
