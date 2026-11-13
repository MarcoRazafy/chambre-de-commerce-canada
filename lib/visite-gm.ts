import "server-only";

// Mode développeur : visite de l'Admin GM dans l'espace d'une Chambre qui l'y autorise.
//  - le lien d'entrée (de l'espace GM à l'adresse de la Chambre) : signé, valable 2 minutes ;
//  - la visite : la session du super admin de la Chambre, plus ce cookie signé (2 heures) qui la désigne comme
//    une visite de l'Admin GM (bandeau, actions signées « (Admin GM) ») ; elle cesse dès que la Chambre
//    retire l'autorisation (proxy.ts).
import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { DUREE_SESSION_VISITE_MS, signer } from "@/lib/auth";
import { SOUS_DOMAINE_ADMIN } from "@/lib/hote-chambre";

export const NOM_COOKIE_VISITE = "gm_visite";
const DUREE_LIEN_MS = 2 * 60_000;
export const DUREE_VISITE_MS = DUREE_SESSION_VISITE_MS;

// Entrée : la Chambre, le compte qui reçoit la visite (super admin), l'Admin GM ; visite : sans la Chambre
// (le cookie ne vaut que sur l'adresse de la Chambre)
export type Entree = { c: string; u: string; g: string; n: string; e: number };
export type Visite = { u: string; g: string; n: string; e: number };

function sceller(charge: object, usage: string): string {
  const brut = Buffer.from(JSON.stringify(charge)).toString("base64url");
  return `${brut}.${signer(brut, usage)}`;
}

function ouvrir<T extends { e: number }>(jeton: string | null | undefined, usage: string): T | null {
  if (!jeton) return null;
  const i = jeton.lastIndexOf(".");
  if (i < 1) return null;
  const brut = jeton.slice(0, i);
  const recue = Buffer.from(jeton.slice(i + 1));
  const attendue = Buffer.from(signer(brut, usage));
  if (recue.length !== attendue.length || !timingSafeEqual(recue, attendue)) return null;
  try {
    const charge = JSON.parse(Buffer.from(brut, "base64url").toString()) as T;
    return typeof charge.e === "number" && charge.e > Date.now() ? charge : null;
  } catch {
    return null;
  }
}

export const lienEntree = (e: Omit<Entree, "e">) => sceller({ ...e, e: Date.now() + DUREE_LIEN_MS }, "entree-gm");
export const lireLienEntree = (jeton: string | null | undefined) => ouvrir<Entree>(jeton, "entree-gm");

export const lireVisite = (valeur: string | null | undefined) => ouvrir<Visite>(valeur, "visite-gm");

export async function ouvrirVisite(v: Omit<Visite, "e">): Promise<void> {
  (await cookies()).set(NOM_COOKIE_VISITE, sceller({ ...v, e: Date.now() + DUREE_VISITE_MS }, "visite-gm"), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DUREE_VISITE_MS / 1000,
  });
}

export async function fermerVisite(): Promise<void> {
  (await cookies()).delete(NOM_COOKIE_VISITE);
}

// La visite en cours (sur cette adresse), si le cookie est valide
export async function visiteCourante(): Promise<Visite | null> {
  return lireVisite((await cookies()).get(NOM_COOKIE_VISITE)?.value);
}

// L'adresse de l'espace administrateur de la plateforme (manage.…), pour y revenir en quittant une visite, et pour les
// liens des courriels et des alertes
export function adresseGM(): string {
  const plateforme = process.env.DOMAINE_PLATEFORME?.trim().toLowerCase();
  if (plateforme) return `https://${SOUS_DOMAINE_ADMIN}.${plateforme}`;
  let port = process.env.PORT || "3000";
  try {
    port = new URL(process.env.APP_URL ?? "").port || port;
  } catch {}
  return `http://${SOUS_DOMAINE_ADMIN}.localhost:${port}`;
}
