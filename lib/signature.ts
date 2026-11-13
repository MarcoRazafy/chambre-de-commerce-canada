// Signature des jetons de la plateforme (sessions, cookie de la Chambre choisie). Sans « server-only » :
// lib/chambre-courante.ts, que les scripts importent aussi, relit la session pour connaître la Chambre sur les
// adresses partagées (app. pour les équipes, client. pour les membres).
import { createHmac, timingSafeEqual } from "node:crypto";

function cle(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET manquant : définissez-le pour signer les sessions.");
  }
  return "cancham-developpement-uniquement";
}

// Signature d'une charge ; « usage » sépare les jetons (ex. « gm » : l'administrateur de la plateforme) d'une même clé
export const signer = (charge: string, usage = "") =>
  createHmac("sha256", cle()).update(usage ? `${usage}:${charge}` : charge).digest("base64url");

const egale = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export const NOM_COOKIE_SESSION = "cancham_session";

// Le compte d'une session signée et pas expirée (« compte.expire[.v].signature ») ; null sinon
export function compteDeLaSession(jeton: string | undefined | null): string | null {
  if (!jeton || jeton.length > 500) return null;
  const separateur = jeton.lastIndexOf(".");
  if (separateur < 0) return null;
  const charge = jeton.slice(0, separateur);
  if (!egale(jeton.slice(separateur + 1), signer(charge))) return null;
  const [userId, expire] = charge.split(".");
  if (!userId || !expire || !(Number(expire) > Date.now())) return null;
  return userId;
}

// La Chambre choisie avant d'avoir un compte (demande d'adhésion sur client.), posée par proxy.ts
export const NOM_COOKIE_CHAMBRE_CHOISIE = "chambre_choisie";
export const scellerChambreChoisie = (chambreId: string) => `${chambreId}.${signer(chambreId, "chambre-choisie")}`;
export function lireChambreChoisie(brut: string | undefined | null): string | null {
  if (!brut || brut.length > 200) return null;
  const separateur = brut.lastIndexOf(".");
  if (separateur < 0) return null;
  const id = brut.slice(0, separateur);
  return id && egale(brut.slice(separateur + 1), signer(id, "chambre-choisie")) ? id : null;
}
