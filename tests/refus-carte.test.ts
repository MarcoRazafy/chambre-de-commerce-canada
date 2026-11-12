import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prismaSysteme: {}, reglagesRetard: async () => ({}) }));
vi.mock("@/lib/courriel", () => ({ envoyerCourriel: vi.fn(), gabarit: vi.fn(), urlPublique: vi.fn() }));
const { messageRefus } = await import("@/lib/abonnement-stripe");

describe("refus de la banque, en clair", () => {
  it("traduit les refus courants", () => {
    expect(messageRefus({ code: "card_declined", decline_code: "insufficient_funds" })).toBe("Fonds insuffisants");
    expect(messageRefus({ code: "expired_card" })).toBe("Carte expirée");
    expect(messageRefus({ code: "authentication_required" })).toMatch(/confirmation/);
    expect(messageRefus({ code: "card_declined", decline_code: "generic_decline" })).toBe("Carte refusée");
    expect(messageRefus(new Error("réseau"))).toBe("Paiement refusé");
  });
});
