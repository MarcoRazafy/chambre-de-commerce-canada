// Retour du navigateur après un paiement sur la page de Stripe (compte de la Chambre de cette adresse) :
// le paiement se conclut tout de suite, puis on revient à la page habituelle du règlement (« vers »).
import { etatSessionStripe } from "@/lib/encaissement-stripe";
import { conclurePaiement } from "@/lib/paiements";

const vers = (chemin: string) => new Response(null, { status: 303, headers: { Location: chemin, "Cache-Control": "no-store" } });

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const suite = p.get("vers") ?? "/";
  const retour = suite.startsWith("/") && !suite.startsWith("//") ? suite : "/";
  const session = p.get("session");
  if (session?.startsWith("cs_")) {
    try {
      const etat = await etatSessionStripe(session);
      if (etat) await conclurePaiement(etat, { stripe: session });
    } catch (e) {
      // La page de retour (et le webhook) rattraperont le paiement
      console.error("[stripe] retour de paiement non appliqué", e);
    }
  }
  return vers(retour);
}
