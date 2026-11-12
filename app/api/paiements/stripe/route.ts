// Notifications de Stripe (webhook), signées : STRIPE_WEBHOOK_SECRET pour le compte de la plateforme (abonnement
// des Chambres), STRIPE_CONNECT_WEBHOOK_SECRET pour les comptes des Chambres (cotisations de leurs membres).
// Sans signature valide : refusées.
import type Stripe from "stripe";
import { traiterEvenement } from "@/lib/abonnement-stripe";
import { traiterEvenementCompte } from "@/lib/encaissement-webhook";
import { stripe, stripeConfigure } from "@/lib/stripe";

export async function POST(req: Request) {
  const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET]
    .map((s) => s?.trim())
    .filter((s): s is string => Boolean(s));
  if (!stripeConfigure() || !secrets.length) return new Response("Paiement par carte non configuré", { status: 503 });
  const corps = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";
  let evenement: Stripe.Event | null = null;
  for (const secret of secrets) {
    try {
      evenement = stripe().webhooks.constructEvent(corps, signature, secret);
      break;
    } catch {}
  }
  if (!evenement) return new Response("Signature invalide", { status: 400 });
  try {
    // Événement d'un compte de Chambre, ou du compte de la plateforme
    if (evenement.account) await traiterEvenementCompte(evenement);
    else await traiterEvenement(evenement);
  } catch (e) {
    // Stripe renverra la notification plus tard
    console.error(`[stripe] ${evenement.type} non traité`, e);
    return new Response("Erreur", { status: 500 });
  }
  return Response.json({ recu: true });
}
