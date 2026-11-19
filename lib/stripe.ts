import "server-only";

import Stripe from "stripe";

let client: Stripe | null = null;

export const stripeConfigure = () => Boolean(process.env.STRIPE_SECRET_KEY?.trim());

export function stripe(): Stripe {
  if (!stripeConfigure()) throw new Error("STRIPE_SECRET_KEY manquant : paiement par carte indisponible");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY!.trim());
  return client;
}

export const enCents = (montant: number) => Math.round(montant * 100);
