// Retour de Google : l'état est vérifié, le code échangé contre l'adresse e-mail (vérifiée par Google), puis la session
// s'ouvre à l'adresse de la Chambre du compte. Pas de compte, demande en cours ou refusée : retour à la page de
// connexion de départ (celle de la Chambre, ou celle du site) avec un message.
import { NextResponse, type NextRequest } from "next/server";
import { adresseEspace, adresseOuSite, adresseSitePlateforme } from "@/lib/adresse-chambre";
import { prismaSysteme as db } from "@/lib/db";
import { lienEntree } from "@/lib/entree-chambre";
import { espaceDuRole, type EspacePartage } from "@/lib/hote-chambre";
import {
  CHEMIN_COOKIE_GOOGLE,
  COOKIE_GOOGLE,
  configGoogle,
  echangerCode,
  emailDuJeton,
  lireEtat,
  memeEtat,
} from "@/lib/google";

export const dynamic = "force-dynamic";

const vers = (url: string) => {
  const r = NextResponse.redirect(url, 303);
  r.headers.set("Cache-Control", "no-store");
  r.cookies.set(COOKIE_GOOGLE, "", { path: CHEMIN_COOKIE_GOOGLE, maxAge: 0 });
  return r;
};

// « depuis » : l'espace partagé de départ (equipe, client), ou la Chambre d'une adresse propre
const estEspace = (d: string): d is EspacePartage => d === "equipe" || d === "client";

// La page de connexion d'où l'on est parti : celle de l'espace partagé ou de la Chambre, sinon celle du site
async function pageConnexion(depuis: string, params: Record<string, string> = {}): Promise<string> {
  const q = new URLSearchParams(params);
  const suffixe = q.size ? `?${q}` : "";
  const chambre = estEspace(depuis) ? adresseEspace(depuis) : depuis ? await adresseOuSite(depuis) : null;
  if (chambre) return `${chambre}/auth${suffixe}`;
  const site = adresseSitePlateforme();
  if (site) return `${site}/connexion${suffixe}`;
  return new URL("/", process.env.GOOGLE_URL_RETOUR ?? "http://localhost").toString();
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const etat = lireEtat(req.cookies.get(COOKIE_GOOGLE)?.value);
  const depuis = etat?.depuis ?? "";
  const erreur = async (message: string, plus: Record<string, string> = {}) =>
    vers(await pageConnexion(depuis, { erreur: message, ...plus }));

  const c = configGoogle();
  if (!c) return erreur("La connexion avec Google n’est pas disponible.");
  if (!etat || !memeEtat(etat, sp.get("state"))) return erreur("La connexion avec Google a expiré : recommencez.");
  // Choix annulé sur la page de Google : retour à la connexion, sans message
  if (sp.get("error")) return vers(await pageConnexion(depuis));

  const code = sp.get("code");
  if (!code || code.length > 2000) return erreur("La connexion avec Google a échoué : recommencez.");
  const idToken = await echangerCode(c, code, etat.verificateur).catch(() => null);
  const email = idToken ? emailDuJeton(idToken, c.id) : null;
  if (!email) return erreur("Google n’a pas confirmé votre adresse e-mail.");

  const u = await db.user.findUnique({
    where: { email },
    select: { id: true, role: true, chambreId: true, member: { select: { statut: true } } },
  });
  if (!u || u.role === "visiteur") {
    return erreur(`Aucun compte n’utilise l’adresse ${email}. Connectez-vous avec votre mot de passe, ou demandez une adhésion.`, { email });
  }
  if (u.member?.statut === "refusee") return erreur("Votre demande d’adhésion n’a pas été retenue.", { email });
  // Parti de son propre espace : la page demandée est gardée ; sinon, chacun arrive dans le sien
  const chezSoi = estEspace(depuis) ? depuis === espaceDuRole(u.role) : depuis === u.chambreId;
  if (u.member?.statut === "candidature") {
    return chezSoi ? vers(await pageConnexion(depuis, { attente: "1", email })) : erreur("Votre demande d’adhésion est en cours d’examen.", { email });
  }

  const lien = await lienEntree(u.chambreId, u.id, { suite: chezSoi ? etat.suite : "" });
  if (!lien) return erreur("Votre espace n’a pas encore d’adresse : écrivez à la plateforme.", { email });
  return vers(lien);
}
