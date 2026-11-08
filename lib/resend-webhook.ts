import { createHmac, timingSafeEqual } from "node:crypto";

// Webhooks de Resend, signés à la manière de Svix : HMAC-SHA256 de « id.horodatage.corps »
// avec le secret « whsec_… » décodé en base64 ; l'en-tête peut porter plusieurs signatures « v1,… »
export const TOLERANCE_SECONDES = 5 * 60;

export function signatureResendValide({
  secret,
  id,
  horodatage,
  signatures,
  corps,
  maintenant = Date.now(),
}: {
  secret: string;
  id: string | null;
  horodatage: string | null;
  signatures: string | null;
  corps: string;
  maintenant?: number;
}): boolean {
  if (!secret || !id || !horodatage || !signatures) return false;
  const t = Number(horodatage);
  if (!Number.isFinite(t) || Math.abs(maintenant / 1000 - t) > TOLERANCE_SECONDES) return false;
  const cle = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const attendue = createHmac("sha256", cle).update(`${id}.${horodatage}.${corps}`).digest();
  return signatures.split(" ").some((s) => {
    const [version, valeur] = s.split(",");
    if (version !== "v1" || !valeur) return false;
    const recue = Buffer.from(valeur, "base64");
    return recue.length === attendue.length && timingSafeEqual(recue, attendue);
  });
}

export type EvenementResend = {
  type: string;
  created_at?: string;
  data?: { email_id?: string; to?: string[]; bounce?: { type?: string } };
};

// Ce qu'un événement change pour le suivi d'un envoi de lettre, et pour l'abonné
export function effetEvenement(e: EvenementResend): {
  envoi: "livreLe" | "ouvertLe" | "clicLe" | "erreurLe" | null;
  abonne: "erreurLe" | "desabonneLe" | null;
} {
  switch (e.type) {
    case "email.delivered":
      return { envoi: "livreLe", abonne: null };
    case "email.opened":
      return { envoi: "ouvertLe", abonne: null };
    case "email.clicked":
      return { envoi: "clicLe", abonne: null };
    case "email.bounced":
      // Un rebond temporaire (boîte pleine…) ne condamne pas l'adresse
      return { envoi: "erreurLe", abonne: e.data?.bounce?.type === "Transient" ? null : "erreurLe" };
    case "email.suppressed":
    case "email.failed":
      return { envoi: "erreurLe", abonne: e.type === "email.suppressed" ? "erreurLe" : null };
    case "email.complained":
      // Signalé comme indésirable : la personne ne veut plus de nos lettres
      return { envoi: null, abonne: "desabonneLe" };
    default:
      return { envoi: null, abonne: null };
  }
}
