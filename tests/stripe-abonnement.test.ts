import Stripe from "stripe";
import { afterEach, describe, expect, it, vi } from "vitest";

const traiterEvenement = vi.fn(async () => {});
vi.mock("@/lib/abonnement-stripe", () => ({ traiterEvenement }));
const { POST } = await import("@/app/api/paiements/stripe/route");

const SECRET = "whsec_essai_local";
const corps = JSON.stringify({ id: "evt_1", object: "event", type: "payment_intent.succeeded", data: { object: { id: "pi_1", metadata: { factureId: "f1" } } } });
const requete = (signature?: string) =>
  new Request("http://localhost/api/paiements/stripe", { method: "POST", body: corps, headers: signature ? { "stripe-signature": signature } : {} });

afterEach(() => {
  vi.unstubAllEnvs();
  traiterEvenement.mockClear();
});

describe("notifications de Stripe (webhook)", () => {
  it("non configuré : refusé, rien n'est traité", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    expect((await POST(requete("t=1,v1=x"))).status).toBe(503);
    expect(traiterEvenement).not.toHaveBeenCalled();
  });

  it("signature absente ou fausse : refusé", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_essai");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", SECRET);
    expect((await POST(requete())).status).toBe(400);
    const fausse = Stripe.webhooks.generateTestHeaderString({ payload: corps, secret: "whsec_autre" });
    expect((await POST(requete(fausse))).status).toBe(400);
    expect(traiterEvenement).not.toHaveBeenCalled();
  });

  it("signée par Stripe : l'événement est traité", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_essai");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", SECRET);
    const signature = Stripe.webhooks.generateTestHeaderString({ payload: corps, secret: SECRET });
    const r = await POST(requete(signature));
    expect(r.status).toBe(200);
    expect(traiterEvenement).toHaveBeenCalledWith(expect.objectContaining({ id: "evt_1", type: "payment_intent.succeeded" }));
  });
});
