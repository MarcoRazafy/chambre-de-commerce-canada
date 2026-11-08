import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { annulerEnvoisProgrammesPour } from "@/lib/newsletter";
import { effetEvenement, signatureResendValide, type EvenementResend } from "@/lib/resend-webhook";

// Webhook de Resend : remise, ouverture, clic, rebond et plainte des courriels de la newsletter.
// À déclarer dans Resend (Webhooks) avec l'adresse …/api/courriels/resend ; secret dans RESEND_WEBHOOK_SECRET.
export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return new Response("webhook non configuré", { status: 503 });

  const corps = await req.text();
  const valide = signatureResendValide({
    secret,
    id: req.headers.get("svix-id"),
    horodatage: req.headers.get("svix-timestamp"),
    signatures: req.headers.get("svix-signature"),
    corps,
  });
  if (!valide) {
    console.error("[resend] webhook à signature invalide, rejeté");
    return new Response("signature invalide", { status: 401 });
  }

  let e: EvenementResend;
  try {
    e = JSON.parse(corps) as EvenementResend;
  } catch {
    return new Response("corps illisible", { status: 400 });
  }

  const quand = e.created_at ? new Date(e.created_at) : new Date();
  const moment = Number.isNaN(quand.getTime()) ? new Date() : quand;
  const effet = effetEvenement(e);
  const emailId = e.data?.email_id;
  const adresse = e.data?.to?.[0]?.toLowerCase();

  if (effet.envoi && emailId) {
    // La première date compte (une lettre rouverte ne change pas son taux) ; un clic vaut ouverture
    await prisma.envoiLettre.updateMany({ where: { resendId: emailId, [effet.envoi]: null }, data: { [effet.envoi]: moment } });
    if (effet.envoi === "clicLe") {
      await prisma.envoiLettre.updateMany({ where: { resendId: emailId, ouvertLe: null }, data: { ouvertLe: moment } });
    }
  }
  if (effet.abonne && adresse) {
    await prisma.abonne.updateMany({ where: { email: adresse, [effet.abonne]: null }, data: { [effet.abonne]: moment } });
    if (effet.abonne === "desabonneLe") await annulerEnvoisProgrammesPour(adresse);
  }
  if (effet.envoi || effet.abonne) {
    revalidatePath("/admin/newsletter");
    revalidatePath("/admin/abonnes");
  }

  return Response.json({ recu: true }, { headers: { "Cache-Control": "no-store" } });
}
