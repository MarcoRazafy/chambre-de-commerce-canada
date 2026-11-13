// Départ de la connexion avec Google : l'état (anti-falsification, vérificateur PKCE, Chambre de départ, page
// d'arrivée) est posé dans un cookie signé à l'adresse du retour, puis la page de Google s'ouvre.
import { NextResponse, type NextRequest } from "next/server";
import {
  CHEMIN_COOKIE_GOOGLE,
  COOKIE_GOOGLE,
  configGoogle,
  nouvelEtat,
  scellerEtat,
  urlAutorisation,
} from "@/lib/google";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const c = configGoogle();
  if (!c) return new NextResponse("Connexion avec Google non réglée.", { status: 404 });

  const sp = req.nextUrl.searchParams;
  const retour = new URL(c.retour);
  // Le cookie doit être posé à l'adresse du retour : on y repasse si on arrive d'ailleurs
  const hote = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").split(",")[0].trim().toLowerCase();
  if (hote && hote !== retour.host) {
    const ici = new URL("/api/google/connexion", c.retour);
    ici.search = req.nextUrl.search;
    return NextResponse.redirect(ici, 303);
  }

  const etat = nouvelEtat(sp.get("depuis") ?? "", sp.get("suite") ?? "");
  const reponse = NextResponse.redirect(urlAutorisation(c, etat), 303);
  reponse.headers.set("Cache-Control", "no-store");
  reponse.cookies.set(COOKIE_GOOGLE, scellerEtat(etat), {
    httpOnly: true,
    secure: retour.protocol === "https:",
    sameSite: "lax",
    path: CHEMIN_COOKIE_GOOGLE,
    maxAge: 600,
  });
  return reponse;
}
