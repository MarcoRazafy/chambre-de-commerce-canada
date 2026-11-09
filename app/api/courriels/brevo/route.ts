import { timingSafeEqual } from "node:crypto";
import { effetBrevo, identifiantsBrevo, momentBrevo, type EvenementBrevo } from "@/lib/brevo-webhook";
import { appliquerSuivi } from "@/lib/suivi-courriels";

// Webhook transactionnel de Brevo : remise, ouverture, clic, rebond, plainte, désabonnement.
// À déclarer dans Brevo (Transactionnel → Paramètres → Webhook) avec l'adresse
// …/api/courriels/brevo?jeton=<BREVO_WEBHOOK_SECRET>. Brevo ne signe pas ses webhooks : le jeton en tient lieu.
function jetonValide(recu: string | null): boolean {
  const attendu = process.env.BREVO_WEBHOOK_SECRET;
  if (!attendu || !recu) return false;
  const a = Buffer.from(attendu), b = Buffer.from(recu);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!process.env.BREVO_WEBHOOK_SECRET) return new Response("webhook non configuré", { status: 503 });
  if (!jetonValide(new URL(req.url).searchParams.get("jeton"))) {
    console.error("[brevo] webhook sans jeton valide, rejeté");
    return new Response("non autorisé", { status: 401 });
  }

  let corps: unknown;
  try {
    corps = await req.json();
  } catch {
    return new Response("corps illisible", { status: 400 });
  }
  // Brevo peut regrouper plusieurs événements dans un même appel
  const evenements = (Array.isArray(corps) ? corps : [corps]) as EvenementBrevo[];
  for (const e of evenements.slice(0, 500)) {
    const { suivi, messageId } = identifiantsBrevo(e);
    await appliquerSuivi({
      effet: effetBrevo(e),
      envoi: { id: suivi, fournisseurId: messageId },
      adresse: e.email,
      moment: momentBrevo(e),
    });
  }
  return Response.json({ recu: true }, { headers: { "Cache-Control": "no-store" } });
}
