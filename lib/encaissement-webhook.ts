import "server-only";

// Notifications d'un compte Stripe de Chambre (Stripe Connect) : compte prêt à encaisser, paiement d'un membre
import type Stripe from "stripe";
import { avecChambre } from "@/lib/chambre-courante";
import { prismaSysteme as db } from "@/lib/db";
import { etatSessionStripe, majCompteStripe } from "@/lib/encaissement-stripe";
import { conclurePaiement } from "@/lib/paiements";

export async function traiterEvenementCompte(ev: Stripe.Event): Promise<void> {
  const compte = ev.account;
  if (!compte) return;
  if (ev.type === "account.updated") {
    await majCompteStripe(compte, ev.data.object);
    return;
  }
  if (
    ev.type === "checkout.session.completed" ||
    ev.type === "checkout.session.async_payment_succeeded" ||
    ev.type === "checkout.session.expired"
  ) {
    const chambre = await db.chambre.findUnique({ where: { stripeCompteId: compte }, select: { id: true } });
    if (!chambre) return;
    await avecChambre(chambre.id, async () => {
      const etat = await etatSessionStripe(ev.data.object.id, compte);
      if (etat) await conclurePaiement(etat, { stripe: ev.data.object.id });
    });
  }
}
