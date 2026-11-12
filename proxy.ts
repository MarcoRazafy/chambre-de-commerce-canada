import { NextResponse, type NextRequest } from "next/server";
import { lireSession, NOM_COOKIE, sessionPerimee } from "@/lib/auth";
import { resoudreHote } from "@/lib/chambre-courante";
// Avant la page, la Chambre n'est pas encore établie : lectures par identifiant (session signée), sans limite
import { prismaSysteme as prisma } from "@/lib/db";
import { isAccessLocked, PAGES_TOUJOURS_OUVERTES } from "@/lib/membership";

const TOUJOURS_OUVERT = PAGES_TOUJOURS_OUVERTES;
const REPLI = "/membre/profil";
const CONNEXION = "/auth";

const DOMAINE = process.env.DOMAINE_PRINCIPAL?.trim().toLowerCase() || null;

// DOMAINE_PRINCIPAL : l'adresse de la Chambre n° 1 ; les autres adresses générales y sont renvoyées.
// L'adresse propre d'une Chambre (sous-domaine de la plateforme, domaine propre) n'est jamais renvoyée.
function versDomainePrincipal(request: NextRequest): NextResponse | null {
  if (!DOMAINE) return null;
  const hote = (
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    ""
  )
    .toLowerCase()
    .split(":")[0];
  if (
    !hote ||
    hote === DOMAINE ||
    hote === "localhost" ||
    hote.endsWith(".localhost") ||
    /^[\d.]+$/.test(hote)
  ) {
    return null;
  }

  const url = request.nextUrl.clone();
  url.protocol = "https:";
  url.host = DOMAINE;
  url.port = "";
  return NextResponse.redirect(url, 308);
}

const ACCUEIL: Record<string, string> = {
  membre: "/membre",
  admin: "/admin",
  visiteur: CONNEXION,
};

// Sous-domaine de la plateforme sans Chambre
const INTROUVABLE = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Espace introuvable</title></head><body style="margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#f5f7fa;color:#13243a"><h1 style="font-size:22px;font-weight:700">Espace introuvable</h1></body></html>`;

export default async function proxy(request: NextRequest) {
  // La Chambre de l'adresse du site
  const ici = await resoudreHote(
    request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
  );
  if (!ici.id) {
    return new NextResponse(INTROUVABLE, {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
  if (!ici.propre) {
    const canonique = versDomainePrincipal(request);
    if (canonique) return canonique;
  }

  const { pathname } = request.nextUrl;
  const espace = pathname.startsWith("/admin")
    ? "admin"
    : pathname.startsWith("/membre")
      ? "membre"
      : null;
  if (!espace) return NextResponse.next();

  const vers = (chemin: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = chemin;
    url.search = "";
    for (const [k, v] of Object.entries(params ?? {})) {
      url.searchParams.set(k, v);
    }
    return NextResponse.redirect(url);
  };

  const session = lireSession(request.cookies.get(NOM_COOKIE)?.value);
  if (!session) {
    return vers(CONNEXION, { suite: `${pathname}${request.nextUrl.search}` });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true, memberId: true, motDePasseModifieLe: true, chambreId: true },
  });
  if (!user || sessionPerimee(session, user.motDePasseModifieLe)) {
    return vers(CONNEXION);
  }
  // Un compte n'est reconnu que sur l'adresse de sa Chambre : ailleurs, on se connecte comme un visiteur
  if (user.chambreId !== ici.id) {
    const reponse = vers(CONNEXION, { suite: `${pathname}${request.nextUrl.search}` });
    reponse.cookies.delete(NOM_COOKIE);
    return reponse;
  }
  if (user.role === "admin" && pathname === "/membre/rendez-vous") {
    return vers("/admin/rendez-vous", {
      msg: "Ce lien ouvre la prise de rendez-vous des membres : il fonctionne pour un membre connecté.",
    });
  }
  if (user.role !== espace) return vers(ACCUEIL[user.role] ?? CONNEXION);

  if (espace === "admin") return NextResponse.next();

  const member = user.memberId
    ? await prisma.member.findUnique({
        where: { id: user.memberId },
        select: { statut: true, retardDepuis: true },
      })
    : null;

  if (member?.statut === "candidature")
    return vers(CONNEXION, { attente: "1" });

  if (TOUJOURS_OUVERT.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const vue = member
    ? {
        statut: member.statut,
        retardDepuis: member.retardDepuis
          ? member.retardDepuis.toISOString().slice(0, 10)
          : null,
      }
    : null;

  if (isAccessLocked(vue as Parameters<typeof isAccessLocked>[0])) {
    return vers(REPLI, { verrouille: "1" });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|televersements|favicon.ico|apple-icon.png).*)",
  ],
};
