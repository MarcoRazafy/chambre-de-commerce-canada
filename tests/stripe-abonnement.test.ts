import Stripe from "stripe";
import { afterEach, describe, expect, it, vi } from "vitest";

const traiterEvenement = vi.fn(async () => {});
const traiterEvenementCompte = vi.fn(async () => {});
vi.mock("@/lib/abonnement-stripe", () => ({ traiterEvenement }));
vi.mock("@/lib/encaissement-webhook", () => ({ traiterEvenementCompte }));
const { POST } = await import("@/app/api/paiements/stripe/route");

const SECRET = "whsec_essai_local";
const corps = JSON.stringify({ id: "evt_1", object: "event", type: "payment_intent.succeeded", data: { object: { id: "pi_1", metadata: { factureId: "f1" } } } });
const requete = (signature?: string) =>
  new Request("http://localhost/api/paiements/stripe", { method: "POST", body: corps, headers: signature ? { "stripe-signature": signature } : {} });

afterEach(() => {
  vi.unstubAllEnvs();
  traiterEvenement.mockClear();
  traiterEvenementCompte.mockClear();
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
    expect(traiterEvenementCompte).not.toHaveBeenCalled();
  });

  it("événement d'un compte de Chambre, signé avec son secret : traité comme tel", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_essai");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", SECRET);
    vi.stubEnv("STRIPE_CONNECT_WEBHOOK_SECRET", "whsec_comptes");
    const duCompte = JSON.stringify({ id: "evt_2", object: "event", account: "acct_1", type: "checkout.session.completed", data: { object: { id: "cs_1" } } });
    const signature = Stripe.webhooks.generateTestHeaderString({ payload: duCompte, secret: "whsec_comptes" });
    const r = await POST(new Request("http://localhost/api/paiements/stripe", { method: "POST", body: duCompte, headers: { "stripe-signature": signature } }));
    expect(r.status).toBe(200);
    expect(traiterEvenementCompte).toHaveBeenCalledWith(expect.objectContaining({ id: "evt_2", account: "acct_1" }));
    expect(traiterEvenement).not.toHaveBeenCalled();
  });
});
