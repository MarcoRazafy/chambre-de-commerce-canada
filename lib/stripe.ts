import "server-only";

// Stripe (compte de la plateforme) : STRIPE_SECRET_KEY pour l'API, STRIPE_WEBHOOK_SECRET pour les notifications.
// Sans clé, le paiement par carte n'est pas proposé.
import Stripe from "stripe";

let client: Stripe | null = null;

export const stripeConfigure = () => Boolean(process.env.STRIPE_SECRET_KEY?.trim());

export function stripe(): Stripe {
  if (!stripeConfigure()) throw new Error("STRIPE_SECRET_KEY manquant : paiement par carte indisponible");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY!.trim());
  return client;
}

// Montant en dollars → en cents (Stripe compte en plus petite unité)
export const enCents = (montant: number) => Math.round(montant * 100);
