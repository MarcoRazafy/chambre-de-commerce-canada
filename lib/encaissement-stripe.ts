import "server-only";

import type Stripe from "stripe";
import { prisma, prismaSysteme as db } from "@/lib/db";
import { stripe, stripeConfigure } from "@/lib/stripe";
import type { EtatPaiement } from "@/lib/vanillapay";

const SANS_DECIMALES = new Set(["mga"]);
export const montantStripe = (montant: number, devise: string) =>
  SANS_DECIMALES.has(devise.toLowerCase()) ? Math.round(montant) : Math.round(montant * 100);
export const partPlateforme = (unites: number, pourcent: number) => (pourcent > 0 ? Math.round((unites * pourcent) / 100) : 0);

export async function compteStripeActif(): Promise<string | null> {
  if (!stripeConfigure()) return null;
  const c = await prisma.chambre.findFirst({ select: { stripeCompteId: true, stripeCompteActif: true } });
  return c?.stripeCompteId && c.stripeCompteActif ? c.stripeCompteId : null;
}

export async function lienInscriptionStripe(chambreId: string, retour: string): Promise<string> {
  const c = await db.chambre.findUnique({ where: { id: chambreId }, select: { stripeCompteId: true, nom: true, profil: { select: { email: true } } } });
  if (!c) throw new Error(`Chambre ${chambreId} introuvable`);
  let compte = c.stripeCompteId;
  if (!compte) {
    const a = await stripe().accounts.create(
      {
        controller: { stripe_dashboard: { type: "full" }, fees: { payer: "account" }, losses: { payments: "stripe" }, requirement_collection: "stripe" },
        email: c.profil?.email || undefined,
        business_profile: { name: c.nom },
        metadata: { chambreId },
      },
      { idempotencyKey: `compte-${chambreId}-${Math.floor(Date.now() / 60_000)}` },
    );
    compte = a.id;
    await db.chambre.update({ where: { id: chambreId }, data: { stripeCompteId: compte } });
  }
  const sep = retour.includes("?") ? "&" : "?";
  const lien = await stripe().accountLinks.create({
    account: compte,
    type: "account_onboarding",
    refresh_url: `${retour}${sep}stripe=reprendre`,
    return_url: `${retour}${sep}stripe=retour`,
  });
  return lien.url;
}

export async function majCompteStripe(compteId: string, a?: Stripe.Account): Promise<boolean> {
  const compte = a ?? (await stripe().accounts.retrieve(compteId));
  await db.chambre.updateMany({
    where: { stripeCompteId: compteId },
    data: { stripeCompteActif: Boolean(compte.charges_enabled), stripeComptePays: compte.country ?? null },
  });
  return Boolean(compte.charges_enabled);
}

async function commission(): Promise<number> {
  const r = await db.reglagesPlateforme.findUnique({ where: { id: "plateforme" }, select: { commissionCotisations: true } });
  return r?.commissionCotisations ?? 0;
}

export async function ouvrirChezStripe(
  r: { reference: string; montant: number; devise: string; libelle: string; chambreId: string; email?: string | null },
  compte: string,
  base: string,
  cheminRetour: string,
): Promise<{ url: string; session: string }> {
  const devise = r.devise.toLowerCase();
  const unites = montantStripe(r.montant, devise);
  const part = partPlateforme(unites, await commission());
  const s = await stripe().checkout.sessions.create(
    {
      mode: "payment",
      line_items: [{ quantity: 1, price_data: { currency: devise, unit_amount: unites, product_data: { name: r.libelle } } }],
      adaptive_pricing: { enabled: false },
      ...(r.email ? { customer_email: r.email } : {}),
      client_reference_id: r.reference,
      metadata: { reference: r.reference, chambreId: r.chambreId },
      payment_intent_data: { metadata: { reference: r.reference, chambreId: r.chambreId }, ...(part > 0 ? { application_fee_amount: part } : {}) },
      success_url: `${base}/api/paiements/stripe/retour?${new URLSearchParams({ vers: cheminRetour })}&session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}${cheminRetour}`,
    },
    { stripeAccount: compte },
  );
  if (!s.url) throw new Error("Stripe n'a pas donné d'adresse de paiement");
  return { url: s.url, session: s.id };
}

export async function etatSessionStripe(sessionId: string, compte?: string): Promise<EtatPaiement | null> {
  if (!stripeConfigure()) return null;
  const compteId = compte ?? (await prisma.chambre.findFirst({ select: { stripeCompteId: true } }))?.stripeCompteId;
  if (!compteId) return null;
  const s = await stripe().checkout.sessions.retrieve(sessionId, {}, { stripeAccount: compteId });
  const reference = s.metadata?.reference ?? s.client_reference_id;
  if (!reference) return null;
  const transaction = typeof s.payment_intent === "string" ? s.payment_intent : (s.payment_intent?.id ?? null);
  if (s.payment_status === "paid") return { reference, reussi: true, echoue: false, montant: null, transaction };
  if (s.status === "expired") return { reference, reussi: false, echoue: true, montant: null, transaction };
  return null;
}

export const estSessionStripe = (transaction: string | null | undefined) => Boolean(transaction?.startsWith("cs_"));
