import "server-only";

// Connexion avec Google (OpenID Connect : code d'autorisation et PKCE). Une seule adresse de retour, déclarée chez
// Google (GOOGLE_URL_RETOUR) : le départ (/api/google/connexion) et le retour (/api/google/retour) se font à cette
// adresse, qui pose et relit l'état dans un cookie signé. Le compte est trouvé par son adresse e-mail, vérifiée par
// Google ; la session s'ouvre ensuite à l'adresse de sa Chambre (jeton d'entrée à usage unique). Google ne crée
// jamais de compte. Sans les trois variables, le bouton n'apparaît pas.
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { signer } from "@/lib/auth";

export const COOKIE_GOOGLE = "google_oauth";
export const CHEMIN_COOKIE_GOOGLE = "/api/google";
const DUREE_ETAT = 10 * 60 * 1000;
const IDENTIFIANT = /^[A-Za-z0-9_-]{1,64}$/;

export type ConfigGoogle = { id: string; secret: string; retour: string };

export function configGoogle(): ConfigGoogle | null {
  const id = process.env.GOOGLE_CLIENT_ID?.trim();
  const secret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const retour = process.env.GOOGLE_URL_RETOUR?.trim();
  if (!id || !secret || !retour) return null;
  try {
    const u = new URL(retour);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  } catch {
    return null;
  }
  return { id, secret, retour };
}

// Un chemin de l'espace (après la connexion), jamais une autre adresse
export const suiteSure = (s: string | null | undefined): string =>
  s && s.startsWith("/") && !s.startsWith("//") && !s.includes("\\") && s.length <= 300 ? s : "";

export const identifiantSur = (s: string | null | undefined): string => (s && IDENTIFIANT.test(s) ? s : "");

// Le lien du bouton « Continuer avec Google » ; depuis : la Chambre de la page de connexion (vide : le site)
export function lienGoogle(o: { depuis?: string | null; suite?: string | null } = {}): string | null {
  const c = configGoogle();
  if (!c) return null;
  const u = new URL("/api/google/connexion", c.retour);
  const depuis = identifiantSur(o.depuis);
  const suite = suiteSure(o.suite);
  if (depuis) u.searchParams.set("depuis", depuis);
  if (suite) u.searchParams.set("suite", suite);
  return u.toString();
}

export type EtatGoogle = { etat: string; verificateur: string; depuis: string; suite: string; expire: number };

export function nouvelEtat(depuis: string, suite: string, maintenant = Date.now()): EtatGoogle {
  return {
    etat: randomBytes(24).toString("base64url"),
    verificateur: randomBytes(32).toString("base64url"),
    depuis: identifiantSur(depuis),
    suite: suiteSure(suite),
    expire: maintenant + DUREE_ETAT,
  };
}

export function scellerEtat(e: EtatGoogle): string {
  const charge = Buffer.from(JSON.stringify(e)).toString("base64url");
  return `${charge}.${signer(charge, "google")}`;
}

const egaux = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

// L'état relu dans le cookie : signé par la plateforme et pas expiré, sinon null
export function lireEtat(brut: string | undefined, maintenant = Date.now()): EtatGoogle | null {
  if (!brut || brut.length > 2000) return null;
  const [charge, signature] = brut.split(".");
  if (!charge || !signature || !egaux(signature, signer(charge, "google"))) return null;
  try {
    const e = JSON.parse(Buffer.from(charge, "base64url").toString("utf8")) as EtatGoogle;
    if (typeof e.etat !== "string" || typeof e.verificateur !== "string" || typeof e.expire !== "number") return null;
    if (e.expire <= maintenant) return null;
    return { ...e, depuis: identifiantSur(e.depuis), suite: suiteSure(e.suite) };
  } catch {
    return null;
  }
}

// L'état renvoyé par Google est-il celui du cookie ?
export const memeEtat = (e: EtatGoogle, recu: string | null | undefined) => !!recu && recu.length <= 200 && egaux(e.etat, recu);

export const defi = (verificateur: string) => createHash("sha256").update(verificateur).digest("base64url");

export function urlAutorisation(c: ConfigGoogle, e: EtatGoogle): string {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.search = new URLSearchParams({
    client_id: c.id,
    redirect_uri: c.retour,
    response_type: "code",
    scope: "openid email",
    state: e.etat,
    code_challenge: defi(e.verificateur),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return u.toString();
}

// L'adresse e-mail du jeton d'identité, reçu directement de Google (en HTTPS, contre le secret du client : sa
// signature n'a pas à être revérifiée). Null si le jeton n'est pas pour cette application, a expiré, ou si Google
// n'a pas vérifié l'adresse.
export function emailDuJeton(idToken: string, clientId: string, maintenant = Date.now()): string | null {
  const parties = idToken.split(".");
  if (parties.length !== 3) return null;
  try {
    const p = JSON.parse(Buffer.from(parties[1], "base64url").toString("utf8")) as Record<string, unknown>;
    if (p.iss !== "https://accounts.google.com" && p.iss !== "accounts.google.com") return null;
    if (p.aud !== clientId) return null;
    if (typeof p.exp !== "number" || p.exp * 1000 <= maintenant) return null;
    if (p.email_verified !== true && p.email_verified !== "true") return null;
    const email = typeof p.email === "string" ? p.email.trim().toLowerCase() : "";
    return email && email.length <= 200 && email.includes("@") ? email : null;
  } catch {
    return null;
  }
}

// Le code reçu au retour contre le jeton d'identité
export async function echangerCode(c: ConfigGoogle, code: string, verificateur: string): Promise<string | null> {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: c.id,
      client_secret: c.secret,
      redirect_uri: c.retour,
      grant_type: "authorization_code",
      code_verifier: verificateur,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) return null;
  const j = (await r.json().catch(() => null)) as { id_token?: unknown } | null;
  return typeof j?.id_token === "string" ? j.id_token : null;
}
