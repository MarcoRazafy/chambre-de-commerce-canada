import "server-only";

// Encaissement des règlements des membres (cotisations, factures, billets) par carte, sur le compte Stripe de
// la Chambre (Stripe Connect) : l'argent va directement à la Chambre ; la plateforme peut en garder une part
// (réglée par l'Admin GM, 0 % par défaut). Le paiement se conclut comme ceux des autres prestataires
// (lib/paiements.ts, conclurePaiement), à partir de l'état lu ici.
import type Stripe from "stripe";
import { prisma, prismaSysteme as db } from "@/lib/db";
import { stripe, stripeConfigure } from "@/lib/stripe";
import type { EtatPaiement } from "@/lib/vanillapay";

// Devises sans décimales chez Stripe (l'ariary)
const SANS_DECIMALES = new Set(["mga"]);
export const montantStripe = (montant: number, devise: string) =>
  SANS_DECIMALES.has(devise.toLowerCase()) ? Math.round(montant) : Math.round(montant * 100);
// Part de la plateforme, dans l'unité de Stripe
export const partPlateforme = (unites: number, pourcent: number) => (pourcent > 0 ? Math.round((unites * pourcent) / 100) : 0);

// Le compte Stripe de la Chambre en cours, s'il peut encaisser
export async function compteStripeActif(): Promise<string | null> {
  if (!stripeConfigure()) return null;
  const c = await prisma.chambre.findFirst({ select: { stripeCompteId: true, stripeCompteActif: true } });
  return c?.stripeCompteId && c.stripeCompteActif ? c.stripeCompteId : null;
}

// Inscription chez Stripe : le compte de la Chambre (créé au besoin, la Chambre a son propre tableau de bord
// Stripe), puis le lien vers les formulaires de Stripe ; « retour » : la page où revenir (adresse complète)
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
      { idempotencyKey: `compte-${chambreId}` },
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

// L'état du compte chez Stripe, reporté sur la Chambre ; renvoie s'il peut encaisser
export async function majCompteStripe(compteId: string, a?: Stripe.Account): Promise<boolean> {
  const compte = a ?? (await stripe().accounts.retrieve(compteId));
  await db.chambre.updateMany({
    where: { stripeCompteId: compteId },
    data: { stripeCompteActif: Boolean(compte.charges_enabled), stripeComptePays: compte.country ?? null },
  });
  return Boolean(compte.charges_enabled);
}

// Part de la plateforme sur les cotisations (réglages de l'Admin GM)
async function commission(): Promise<number> {
  const r = await db.reglagesPlateforme.findUnique({ where: { id: "plateforme" }, select: { commissionCotisations: true } });
  return r?.commissionCotisations ?? 0;
}

// Ouvre la page de paiement de Stripe pour un règlement, au nom de la Chambre ; « base » : son adresse
export async function ouvrirChezStripe(
  r: { reference: string; montant: number; devise: string; libelle: string; chambreId: string },
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

// L'état d'une session de paiement (sur le compte de la Chambre en cours, ou celui donné), comme celui d'un
// prestataire : payée, expirée (échec), sinon null (en cours)
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

// Une session de paiement Stripe se reconnaît à son identifiant
export const estSessionStripe = (transaction: string | null | undefined) => Boolean(transaction?.startsWith("cs_"));
