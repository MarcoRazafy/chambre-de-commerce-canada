import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Domaine d'expédition d'une Chambre : toutes partagent le compte Brevo, un domaine validé chez Brevo l'est donc pour
// toutes. Une Chambre n'envoie depuis son domaine qu'avec sa propre preuve (TXT signé) lue dans le DNS.
// DNS, base et Brevo simulés.
const ZONES: Record<string, string[][]> = {};
vi.mock("node:dns/promises", () => ({
  Resolver: class {
    async resolveTxt(domaine: string) {
      if (!(domaine in ZONES)) throw Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" });
      return ZONES[domaine];
    }
  },
}));
let profils: { chambreId: string; expediteurDomaine: string }[] = [];
vi.mock("@/lib/db", () => ({
  prismaSysteme: {
    profilChambre: {
      findFirst: async ({ where }: { where: { expediteurDomaine: string; chambreId: { not: string } } }) =>
        profils.find((p) => p.expediteurDomaine === where.expediteurDomaine && p.chambreId !== where.chambreId.not) ?? null,
    },
  },
}));

const { avecPreuve, domaineDeLaPlateforme, domaineDUneAutreChambre, oublierPreuve, preuveDomaine, preuvePresente, PREFIXE_PREUVE } =
  await import("@/lib/domaine-proprietaire");

const BREVO_CODE = { type: "TXT", nom: "@", valeur: "brevo-code:abc", ok: true };
const DKIM1 = { type: "CNAME", nom: "brevo1._domainkey", valeur: "b1.x.dkim.brevo.com", ok: true };
const DMARC = { type: "TXT", nom: "_dmarc", valeur: "v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com", ok: false };

beforeEach(() => {
  for (const k of Object.keys(ZONES)) delete ZONES[k];
  profils = [];
  oublierPreuve();
});
afterEach(() => vi.unstubAllEnvs());

describe("la preuve de propriété", () => {
  it("est propre à une Chambre et à un domaine, sans tenir compte des majuscules", () => {
    const a = preuveDomaine("c-a", "entreprise.mg");
    expect(a.startsWith(PREFIXE_PREUVE)).toBe(true);
    expect(preuveDomaine("c-a", "Entreprise.MG")).toBe(a);
    expect(preuveDomaine("c-b", "entreprise.mg")).not.toBe(a);
    expect(preuveDomaine("c-a", "autre.mg")).not.toBe(a);
  });

  it("est trouvée dans le DNS, même coupée en morceaux, parmi les autres TXT", async () => {
    const p = preuveDomaine("c-a", "entreprise.mg");
    ZONES["entreprise.mg"] = [["v=spf1 -all"], ["brevo-code:abc"], [p.slice(0, 20), p.slice(20)]];
    expect(await preuvePresente("c-a", "entreprise.mg")).toBe(true);
  });

  it("celle d'une autre Chambre ne vaut rien", async () => {
    ZONES["entreprise.mg"] = [[preuveDomaine("c-a", "entreprise.mg")]];
    expect(await preuvePresente("c-b", "entreprise.mg")).toBe(false);
  });

  it("domaine sans TXT ou inexistant : pas de preuve, sans erreur", async () => {
    expect(await preuvePresente("c-a", "inexistant.mg")).toBe(false);
    ZONES["vide.mg"] = [];
    expect(await preuvePresente("c-a", "vide.mg")).toBe(false);
  });

  it("une fois l'enregistrement ajouté, « Vérifier maintenant » la voit aussitôt (mémoire effacée)", async () => {
    expect(await preuvePresente("c-a", "entreprise.mg")).toBe(false);
    ZONES["entreprise.mg"] = [[preuveDomaine("c-a", "entreprise.mg")]];
    expect(await preuvePresente("c-a", "entreprise.mg")).toBe(false); // encore en mémoire (1 min)
    oublierPreuve("entreprise.mg");
    expect(await preuvePresente("c-a", "entreprise.mg")).toBe(true);
  });
});

describe("l'état affiché à une Chambre", () => {
  it("validé chez Brevo et preuve en place : validé", async () => {
    ZONES["entreprise.mg"] = [[preuveDomaine("c-a", "entreprise.mg")]];
    expect(await avecPreuve("c-a", { etat: "valide", domaine: "entreprise.mg" })).toEqual({ etat: "valide", domaine: "entreprise.mg" });
  });

  it("une Chambre qui reprend le domaine validé d'une autre reste en attente : il lui manque sa preuve", async () => {
    ZONES["entreprise.mg"] = [[preuveDomaine("c-a", "entreprise.mg")]];
    const e = await avecPreuve("c-b", { etat: "valide", domaine: "entreprise.mg" });
    expect(e.etat).toBe("en_attente");
    expect(e.etat === "en_attente" && e.enregistrements).toEqual([{ type: "TXT", nom: "@", valeur: preuveDomaine("c-b", "entreprise.mg"), ok: false }]);
  });

  it("en attente chez Brevo : la preuve s'ajoute juste après le code Brevo", async () => {
    const e = await avecPreuve("c-a", { etat: "en_attente", domaine: "entreprise.mg", enregistrements: [BREVO_CODE, DKIM1, DMARC] });
    expect(e.etat === "en_attente" && e.enregistrements.map((x) => x.valeur)).toEqual([BREVO_CODE.valeur, preuveDomaine("c-a", "entreprise.mg"), DKIM1.valeur, DMARC.valeur]);
  });

  it("absent, indisponible, messagerie gratuite : inchangés", async () => {
    for (const e of [{ etat: "absent", domaine: "x.mg" }, { etat: "indisponible", domaine: "x.mg", raison: "r" }, { etat: "webmail", domaine: "gmail.com" }] as const) {
      expect(await avecPreuve("c-a", e)).toEqual(e);
    }
  });
});

describe("les domaines refusés à l'ajout", () => {
  it("ceux de la plateforme (et leurs sous-domaines), et celui de son adresse d'envoi", () => {
    vi.stubEnv("DOMAINE_PLATEFORME", "lalliee-virtuelle.com");
    expect(domaineDeLaPlateforme("lalliee-virtuelle.com", "envoi.org")).toBe(true);
    expect(domaineDeLaPlateforme("mail.lalliee-virtuelle.com", "envoi.org")).toBe(true);
    expect(domaineDeLaPlateforme("envoi.org", "envoi.org")).toBe(true);
    expect(domaineDeLaPlateforme("entreprise.mg", "envoi.org")).toBe(false);
    expect(domaineDeLaPlateforme("faux-lalliee-virtuelle.com", "envoi.org")).toBe(false);
  });

  it("celui d'une autre Chambre", async () => {
    profils = [{ chambreId: "c-a", expediteurDomaine: "entreprise.mg" }];
    expect(await domaineDUneAutreChambre("c-b", "entreprise.mg")).toBe("c-a");
    expect(await domaineDUneAutreChambre("c-b", "Entreprise.MG")).toBe("c-a");
    expect(await domaineDUneAutreChambre("c-a", "entreprise.mg")).toBeNull();
    expect(await domaineDUneAutreChambre("c-b", "autre.mg")).toBeNull();
  });
});
