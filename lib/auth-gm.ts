import "server-only";

// Session de l'Admin GM : cookie à part, signé à part (une session de Chambre n'ouvre jamais l'espace GM),
// valable 12 heures, sur l'adresse de l'espace GM seulement.
import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { signer } from "@/lib/auth";

export const NOM_COOKIE_GM = "gm_session";
const DUREE_MS = 12 * 3_600_000;

export async function ouvrirSessionGM(id: string): Promise<void> {
  const charge = `${id}.${Date.now() + DUREE_MS}`;
  (await cookies()).set(NOM_COOKIE_GM, `${charge}.${signer(charge, "gm")}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DUREE_MS / 1000,
  });
}

export async function fermerSessionGM(): Promise<void> {
  (await cookies()).delete(NOM_COOKIE_GM);
}

export function lireSessionGM(jeton: string | undefined): { id: string; emiseLe: number } | null {
  if (!jeton) return null;
  const separateur = jeton.lastIndexOf(".");
  if (separateur < 0) return null;
  const charge = jeton.slice(0, separateur);
  const signature = Buffer.from(jeton.slice(separateur + 1));
  const attendue = Buffer.from(signer(charge, "gm"));
  if (signature.length !== attendue.length || !timingSafeEqual(signature, attendue)) return null;
  const [id, expire] = charge.split(".");
  if (!id || !expire || !(Number(expire) > Date.now())) return null;
  return { id, emiseLe: Number(expire) - DUREE_MS };
}

export async function sessionGMCourante() {
  return lireSessionGM((await cookies()).get(NOM_COOKIE_GM)?.value);
}
