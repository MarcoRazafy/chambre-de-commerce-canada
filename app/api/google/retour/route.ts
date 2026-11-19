import { NextResponse, type NextRequest } from "next/server";
import { adresseEspace, adresseOuSite, adresseSitePlateforme } from "@/lib/adresse-chambre";
import { comptesDeLAdresse, comptesOuverts, scellerChoix } from "@/lib/comptes-lies";
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

const estEspace = (d: string): d is EspacePartage => d === "equipe" || d === "client";

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
  if (sp.get("error")) return vers(await pageConnexion(depuis));

  const code = sp.get("code");
  if (!code || code.length > 2000) return erreur("La connexion avec Google a échoué : recommencez.");
  const idToken = await echangerCode(c, code, etat.verificateur).catch(() => null);
  const email = idToken ? emailDuJeton(idToken, c.id) : null;
  if (!email) return erreur("Google n’a pas confirmé votre adresse e-mail.");

  const comptes = (await comptesDeLAdresse(email)).filter((c) => c.role !== "visiteur");
  const dIci = estEspace(depuis) ? null : comptes.find((c) => c.chambreId === depuis);
  const ouverts = comptesOuverts(comptes);
  if (!dIci && ouverts.length > 1) {
    const base = (estEspace(depuis) ? adresseEspace(depuis) : depuis ? await adresseOuSite(depuis) : null) ?? adresseEspace("client");
    if (base) {
      const q = new URLSearchParams({ j: scellerChoix(ouverts.map((c) => c.id)) });
      if (etat.suite) q.set("suite", etat.suite);
      return vers(`${base}/auth/choisir?${q}`);
    }
  }
  const u = dIci ?? ouverts[0] ?? comptes[0];
  if (!u || u.role === "visiteur") {
    return erreur(`Aucun compte n’utilise l’adresse ${email}. Connectez-vous avec votre mot de passe, ou demandez une adhésion.`, { email });
  }
  if (u.member?.statut === "refusee") return erreur("Votre demande d’adhésion n’a pas été retenue.", { email });
  const chezSoi = estEspace(depuis) ? depuis === espaceDuRole(u.role) : depuis === u.chambreId;
  if (u.member?.statut === "candidature") {
    return chezSoi ? vers(await pageConnexion(depuis, { attente: "1", email })) : erreur("Votre demande d’adhésion est en cours d’examen.", { email });
  }

  const lien = await lienEntree(u.chambreId, u.id, { suite: chezSoi ? etat.suite : "" });
  if (!lien) return erreur("Votre espace n’a pas encore d’adresse : écrivez à la plateforme.", { email });
  return vers(lien);
}
