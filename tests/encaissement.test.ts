import { afterEach, describe, expect, it, vi } from "vitest";

// La Chambre en cours, son compte Stripe, VanillaPay : réglés par chaque test
const etat = { chambre: "principale", stripe: null as string | null, vanilla: true, mobile: true };
vi.mock("@/lib/chambre-courante", async (original) => ({
  ...(await original<typeof import("@/lib/chambre-courante")>()),
  chambreCourante: async () => etat.chambre,
}));
vi.mock("@/lib/db", () => ({ prisma: {}, prismaSysteme: {} }));
vi.mock("@/lib/encaissement-stripe", async (original) => ({
  ...(await original<typeof import("@/lib/encaissement-stripe")>()),
  compteStripeActif: async () => etat.stripe,
}));
vi.mock("@/lib/vanillapay", async (original) => ({
  ...(await original<typeof import("@/lib/vanillapay")>()),
  vanillaPayActif: () => etat.vanilla,
  mobileMoneyEnLigne: () => etat.mobile,
}));
const { modesBientot, modesProposes, modesPublics } = await import("@/lib/reglements");
const { montantStripe, partPlateforme } = await import("@/lib/encaissement-stripe");

afterEach(() => Object.assign(etat, { chambre: "principale", stripe: null, vanilla: true, mobile: true }));

describe("encaissement par carte (Stripe) et moyens proposés", () => {
  it("montants : cents pour le dollar, unités pour l'ariary ; part de la plateforme", () => {
    expect(montantStripe(150, "CAD")).toBe(15000);
    expect(montantStripe(19.99, "cad")).toBe(1999);
    expect(montantStripe(250000, "MGA")).toBe(250000);
    expect(partPlateforme(15000, 0)).toBe(0);
    expect(partPlateforme(15000, 2.5)).toBe(375);
  });

  it("Chambre n° 1 : VanillaPay (carte, mobile money) comme avant", async () => {
    expect(await modesProposes()).toEqual(["carte", "mvola", "orange_money", "airtel_money"]);
    etat.vanilla = false;
    expect(await modesProposes()).toEqual(["mvola", "orange_money", "airtel_money"]);
    expect(await modesBientot()).toEqual(["carte"]);
  });

  it("autre Chambre : jamais le compte VanillaPay du serveur ; la carte par son compte Stripe s'il est connecté", async () => {
    etat.chambre = "c-autre";
    expect(await modesProposes()).toEqual([]);
    etat.stripe = "acct_1";
    expect(await modesProposes()).toEqual(["carte"]);
    expect(await modesBientot()).toEqual([]);
  });

  it("sous le minimum de VanillaPay, la carte par Stripe reste proposée", async () => {
    expect(await modesPublics(100)).toEqual([]);
    etat.stripe = "acct_1";
    expect(await modesPublics(100)).toEqual(["carte"]);
  });
});
