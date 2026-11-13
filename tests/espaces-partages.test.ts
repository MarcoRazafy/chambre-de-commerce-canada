import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";

// Espaces partagés (dev. : les équipes, client. : les membres) : la Chambre vient du compte connecté, jamais de
// l'adresse ; avant d'avoir un compte, de la Chambre choisie pour la demande d'adhésion (cookie signé). Une valeur
// falsifiée ne donne aucune Chambre.
let hote = "client.lalliee-virtuelle.com";
let biscuits: Record<string, string> = {};
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: hote }),
  cookies: async () => ({ get: (n: string) => (n in biscuits ? { name: n, value: biscuits[n] } : undefined) }),
}));

const { brancherRechercheChambre, brancherRechercheCompte, chambreCourante, chambreCouranteOuRien, EspaceIntrouvable, hoteActuel, oublierAdresses } =
  await import("@/lib/chambre-courante");
const { scellerChambreChoisie } = await import("@/lib/signature");
const { espaceDuRole } = await import("@/lib/hote-chambre");

const P = "lalliee-virtuelle.com";
const session = (userId: string, expire = Date.now() + 3_600_000, cle = "cle-de-test") => {
  const charge = `${userId}.${expire}`;
  return `${charge}.${createHmac("sha256", cle).update(charge).digest("base64url")}`;
};
const COMPTES: Record<string, string> = { "u-hei": "c-hei", "u-ucan": "c-ucan" };

beforeEach(() => {
  vi.stubEnv("DOMAINE_PLATEFORME", P);
  oublierAdresses();
  biscuits = {};
  brancherRechercheCompte(async (id) => COMPTES[id] ?? null);
  brancherRechercheChambre(async (r) =>
    "domaine" in r && r.domaine === "membres.hei.mg" ? { id: "c-hei", suspendue: false, restriction: null, accesDev: false, fonctions: null } : null,
  );
});
afterEach(() => vi.unstubAllEnvs());

describe("la Chambre sur les espaces partagés", () => {
  it("est celle du compte connecté (session signée), sur client. comme sur dev.", async () => {
    hote = "client.lalliee-virtuelle.com";
    biscuits = { cancham_session: session("u-hei") };
    expect(await chambreCourante()).toBe("c-hei");
    hote = "dev.lalliee-virtuelle.com";
    biscuits = { cancham_session: session("u-ucan") };
    expect(await chambreCourante()).toBe("c-ucan");
    expect(await hoteActuel()).toEqual({ partage: "equipe", chambreId: null });
  });

  it("sans compte, est celle choisie pour la demande d'adhésion (cookie signé)", async () => {
    hote = "client.lalliee-virtuelle.com";
    biscuits = { chambre_choisie: scellerChambreChoisie("c-ucan") };
    expect(await chambreCourante()).toBe("c-ucan");
  });

  it("la session l'emporte toujours sur une Chambre choisie", async () => {
    hote = "client.lalliee-virtuelle.com";
    biscuits = { cancham_session: session("u-hei"), chambre_choisie: scellerChambreChoisie("c-ucan") };
    expect(await chambreCourante()).toBe("c-hei");
  });

  it("refuse un cookie falsifié, une session falsifiée ou expirée : aucune Chambre devinée", async () => {
    hote = "client.lalliee-virtuelle.com";
    biscuits = { chambre_choisie: "c-ucan.signature-inventee" };
    await expect(chambreCourante()).rejects.toBeInstanceOf(EspaceIntrouvable);
    biscuits = { cancham_session: session("u-hei", Date.now() + 3_600_000, "autre-cle") };
    await expect(chambreCourante()).rejects.toBeInstanceOf(EspaceIntrouvable);
    biscuits = { cancham_session: session("u-hei", Date.now() - 1000) };
    await expect(chambreCourante()).rejects.toBeInstanceOf(EspaceIntrouvable);
    biscuits = {};
    await expect(chambreCourante()).rejects.toBeInstanceOf(EspaceIntrouvable);
    expect(await chambreCouranteOuRien()).toBeNull();
  });

  it("un compte inconnu ne donne aucune Chambre", async () => {
    hote = "client.lalliee-virtuelle.com";
    biscuits = { cancham_session: session("u-inconnu") };
    await expect(chambreCourante()).rejects.toBeInstanceOf(EspaceIntrouvable);
  });

  it("sur le domaine propre d'une Chambre, l'adresse décide (la session d'une autre n'y change rien)", async () => {
    hote = "membres.hei.mg";
    biscuits = { cancham_session: session("u-ucan") };
    expect(await chambreCourante()).toBe("c-hei");
    expect(await hoteActuel()).toEqual({ partage: null, chambreId: "c-hei" });
  });
});

describe("l'espace de chaque rôle", () => {
  it("l'équipe au back-office (dev.), les membres à leur espace (client.)", () => {
    expect(espaceDuRole("admin")).toBe("equipe");
    expect(espaceDuRole("membre")).toBe("client");
  });
});
