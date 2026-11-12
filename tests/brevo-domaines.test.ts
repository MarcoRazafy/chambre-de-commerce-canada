import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adresseValidee, domaineDe, estWebmail, etatDomaine, oublierDomaine } from "@/lib/brevo-domaines";

const repondre = (status: number, corps: unknown = {}) =>
  vi.fn(async () => new Response(JSON.stringify(corps), { status, headers: { "content-type": "application/json" } }));

describe("domaines d'expédition chez Brevo", () => {
  beforeEach(() => vi.stubEnv("BREVO_API_KEY", "xkeysib-test"));
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("reconnaît le domaine et les messageries gratuites", () => {
    expect(domaineDe(" Contact@Entreprise.MG ")).toBe("entreprise.mg");
    expect(estWebmail("gmail.com")).toBe(true);
    expect(estWebmail("entreprise.mg")).toBe(false);
  });

  it("vide, messagerie gratuite ou sans clé : pas d'appel à Brevo", async () => {
    const f = repondre(200);
    vi.stubGlobal("fetch", f);
    expect(await etatDomaine("")).toEqual({ etat: "vide" });
    expect(await etatDomaine("moi@gmail.com")).toEqual({ etat: "webmail", domaine: "gmail.com" });
    vi.stubEnv("BREVO_API_KEY", "");
    expect((await etatDomaine("a@entreprise.mg")).etat).toBe("indisponible");
    expect(f).not.toHaveBeenCalled();
  });

  it("lit l'état chez Brevo : absent, validé, ou en attente avec les enregistrements dans l'ordre", async () => {
    vi.stubGlobal("fetch", repondre(404));
    expect(await etatDomaine("a@entreprise.mg")).toEqual({ etat: "absent", domaine: "entreprise.mg" });

    vi.stubGlobal("fetch", repondre(200, { authenticated: true }));
    expect(await etatDomaine("a@entreprise.mg")).toEqual({ etat: "valide", domaine: "entreprise.mg" });

    vi.stubGlobal(
      "fetch",
      repondre(200, {
        authenticated: false,
        dns_records: {
          dmarc_record: { type: "TXT", value: "v=DMARC1; p=none", host_name: "_dmarc", status: false },
          dkim1Record: { type: "CNAME", value: "b1.x.dkim.brevo.com", host_name: "brevo1._domainkey", status: true },
          dkim_record: null,
          brevo_code: { type: "TXT", value: "brevo-code:abc", host_name: "@", status: false },
        },
      }),
    );
    const e = await etatDomaine("a@entreprise.mg");
    expect(e.etat).toBe("en_attente");
    if (e.etat === "en_attente") {
      expect(e.enregistrements.map((x) => [x.nom, x.ok])).toEqual([["@", false], ["brevo1._domainkey", true], ["_dmarc", false]]);
    }
  });

  it("Brevo injoignable : l'adresse n'est pas utilisée (les courriels partent du serveur)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("réseau"); }));
    oublierDomaine("a@injoignable.mg");
    expect(await adresseValidee("a@injoignable.mg")).toBe(false);
  });
});
