import "server-only";

import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

export { hacher, MOT_DE_PASSE_MIN, verifier } from "@/lib/mots-de-passe";

const COOKIE = "cancham_session";
const DUREE_JOURS = 30;

function cle(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET manquant : définissez-le pour signer les sessions.",
    );
  }
  return "cancham-developpement-uniquement";
}

// Signature d'une session ; « usage » sépare les sessions (ex. « gm » : Admin GM) d'une même clé
export const signer = (charge: string, usage = "") =>
  createHmac("sha256", cle()).update(usage ? `${usage}:${charge}` : charge).digest("base64url");

export async function ouvrirSession(
  userId: string,
  souvenir = true,
): Promise<void> {
  const expire = Date.now() + DUREE_JOURS * 86_400_000;
  const charge = `${userId}.${expire}`;
  (await cookies()).set(COOKIE, `${charge}.${signer(charge)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(souvenir ? { maxAge: DUREE_JOURS * 86_400 } : {}),
  });
}

export async function fermerSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export interface Session {
  userId: string;
  emiseLe: number;
}

export async function sessionCourante(): Promise<Session | null> {
  return lireSession((await cookies()).get(COOKIE)?.value);
}

export function sessionPerimee(
  session: Session,
  motDePasseModifieLe: Date | null,
): boolean {
  return (
    motDePasseModifieLe !== null &&
    session.emiseLe + 1000 < motDePasseModifieLe.getTime()
  );
}

export function lireSession(jeton: string | undefined): Session | null {
  if (!jeton) return null;
  const separateur = jeton.lastIndexOf(".");
  if (separateur < 0) return null;

  const charge = jeton.slice(0, separateur);
  const signature = jeton.slice(separateur + 1);
  const attendue = signer(charge);
  if (
    signature.length !== attendue.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(attendue))
  ) {
    return null;
  }

  const [userId, expire] = charge.split(".");
  if (!userId || !expire || Number(expire) < Date.now()) return null;
  return { userId, emiseLe: Number(expire) - DUREE_JOURS * 86_400_000 };
}

export const NOM_COOKIE = COOKIE;
