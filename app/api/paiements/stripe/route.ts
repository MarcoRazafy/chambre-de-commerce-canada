// Notifications de Stripe (webhook) : signées avec STRIPE_WEBHOOK_SECRET, sinon refusées.
// Paiement d'une facture de l'abonnement, carte enregistrée, prélèvement confirmé plus tard.
import { traiterEvenement } from "@/lib/abonnement-stripe";
import { stripe, stripeConfigure } from "@/lib/stripe";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripeConfigure() || !secret) return new Response("Paiement par carte non configuré", { status: 503 });
  const corps = await req.text();
  let evenement;
  try {
    evenement = stripe().webhooks.constructEvent(corps, req.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return new Response("Signature invalide", { status: 400 });
  }
  try {
    await traiterEvenement(evenement);
  } catch (e) {
    // Stripe renverra la notification plus tard
    console.error(`[stripe] ${evenement.type} non traité`, e);
    return new Response("Erreur", { status: 500 });
  }
  return Response.json({ recu: true });
}
