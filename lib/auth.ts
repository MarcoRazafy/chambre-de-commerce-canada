import "server-only";

import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { NOM_COOKIE_SESSION, signer } from "@/lib/signature";

export { hacher, MOT_DE_PASSE_MIN, verifier } from "@/lib/mots-de-passe";

const COOKIE = NOM_COOKIE_SESSION;
const DUREE_JOURS = 30;

// Signature d'une session ; « usage » sépare les sessions (ex. « gm » : l'administrateur de la plateforme) d'une même clé
export { signer };

// Session d'une visite de l'Admin GM (mode développeur) : marquée comme telle, elle dure le temps de la visite
export const DUREE_SESSION_VISITE_MS = 2 * 3_600_000;

export async function ouvrirSession(
  userId: string,
  souvenir = true,
  visite = false,
): Promise<void> {
  const duree = visite ? DUREE_SESSION_VISITE_MS : DUREE_JOURS * 86_400_000;
  const charge = `${userId}.${Date.now() + duree}${visite ? ".v" : ""}`;
  (await cookies()).set(COOKIE, `${charge}.${signer(charge)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(visite ? { maxAge: duree / 1000 } : souvenir ? { maxAge: DUREE_JOURS * 86_400 } : {}),
  });
}

export async function fermerSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export interface Session {
  userId: string;
  emiseLe: number;
  // Session d'une visite de l'Admin GM : valable seulement avec le cookie de la visite (proxy.ts)
  visite: boolean;
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

  const [userId, expire, marque] = charge.split(".");
  if (!userId || !expire || Number(expire) < Date.now()) return null;
  const visite = marque === "v";
  return { userId, emiseLe: Number(expire) - (visite ? DUREE_SESSION_VISITE_MS : DUREE_JOURS * 86_400_000), visite };
}

export const NOM_COOKIE = COOKIE;
