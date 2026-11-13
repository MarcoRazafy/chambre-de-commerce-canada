import { NextResponse, type NextRequest } from "next/server";
import { lireSession, NOM_COOKIE, sessionPerimee } from "@/lib/auth";
import { lireSessionGM, NOM_COOKIE_GM } from "@/lib/auth-gm";
import { lireVisite, NOM_COOKIE_VISITE } from "@/lib/visite-gm";
import { resoudreHote } from "@/lib/chambre-courante";
import { fonctionDuChemin } from "@/lib/fonctions-plateforme";
import { estHoteGM, estHotePlateforme } from "@/lib/hote-chambre";
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

// Page courte, sans la coquille de l'application (sous-domaine sans Chambre, espace suspendu)
const pageCourte = (titre: string, status: number, lien?: { href: string; libelle: string }) =>
  new NextResponse(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titre}</title></head><body style="margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#f5f7fa;color:#13243a"><div style="text-align:center"><h1 style="font-size:22px;font-weight:700;margin:0 0 14px">${titre}</h1>${lien ? `<a href="${lien.href}" style="color:#c8102e;font-weight:600">${lien.libelle}</a>` : ""}</div></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  );
const introuvable = () => pageCourte("Espace introuvable", 404);

const estGM = (chemin: string) => chemin === "/gm" || chemin.startsWith("/gm/");
const estSitePlateforme = (chemin: string) => chemin === "/plateforme" || chemin.startsWith("/plateforme/");

// Espace suspendu par l'Admin GM : la connexion et l'abonnement restent ouverts (pour régulariser)
const OUVERT_SI_SUSPENDUE = (chemin: string) =>
  ["/auth", "/auth/entree", "/auth/entree-gm", "/auth/mot-de-passe-oublie", "/auth/nouveau-mot-de-passe"].includes(chemin) ||
  chemin === "/admin/abonnement" ||
  chemin.startsWith("/admin/abonnement/");

// Espace Admin GM (gm.DOMAINE_PLATEFORME) : seulement ses pages, avec sa propre session
// Pages de l'espace GM ouvertes sans session : connexion, mot de passe oublié
const GM_SANS_SESSION = new Set(["/gm/connexion", "/gm/mot-de-passe-oublie", "/gm/nouveau-mot-de-passe"]);

function proxyGM(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const url = (chemin: string, params?: Record<string, string>) => {
    const u = request.nextUrl.clone();
    u.pathname = chemin;
    u.search = new URLSearchParams(params).toString();
    return u;
  };
  if (pathname === "/") return NextResponse.redirect(url("/gm"));
  // Les fichiers publics (illustrations, icônes…) passent tels quels
  if (/\.[a-z0-9]+$/i.test(pathname)) return NextResponse.next();
  if (!estGM(pathname)) return introuvable();
  if (GM_SANS_SESSION.has(pathname)) return NextResponse.next();
  if (!lireSessionGM(request.cookies.get(NOM_COOKIE_GM)?.value)) {
    return NextResponse.redirect(url("/gm/connexion", { suite: `${pathname}${search}` }));
  }
  return NextResponse.next();
}

// Site public de la plateforme (DOMAINE_PLATEFORME, www.) : ses pages (app/plateforme), sous des adresses courtes
// (« / », « /creer-une-chambre »…) ; les fichiers publics (images…) passent tels quels
function proxyPlateforme(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  if (estSitePlateforme(pathname) || /\.[a-z0-9]+$/i.test(pathname)) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = pathname === "/" ? "/plateforme" : `/plateforme${pathname}`;
  return NextResponse.rewrite(url);
}

export default async function proxy(request: NextRequest) {
  const hote = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (estHoteGM(hote)) return proxyGM(request);
  if (estHotePlateforme(hote)) return proxyPlateforme(request);
  // Les pages de l'Admin GM et du site de la plateforme n'existent qu'à leur adresse
  if (estGM(request.nextUrl.pathname) || estSitePlateforme(request.nextUrl.pathname)) return introuvable();

  // La Chambre de l'adresse du site
  const ici = await resoudreHote(hote);
  if (!ici.id) return introuvable();
  if (!ici.propre) {
    const canonique = versDomainePrincipal(request);
    if (canonique) return canonique;
  }
  const chemin = request.nextUrl.pathname;
  const versAbonnement = chemin.startsWith("/admin") ? { href: "/admin/abonnement?onglet=factures", libelle: "Abonnement" } : undefined;
  if (ici.suspendue && !OUVERT_SI_SUSPENDUE(chemin)) return pageCourte("Espace suspendu", 403, versAbonnement);
  // Retard de paiement de l'abonnement au-delà du délai (réglages de l'Admin GM)
  if (ici.restriction === "blocage" && !OUVERT_SI_SUSPENDUE(chemin)) return pageCourte("Paiement en retard", 403, versAbonnement);
  // Lecture seule : les pages s'affichent, les envois de formulaire (actions serveur) sont refusés
  if (ici.restriction === "lecture" && request.method === "POST" && request.headers.has("next-action") && !OUVERT_SI_SUSPENDUE(chemin)) {
    return new NextResponse("Espace en lecture seule : une facture de l’abonnement attend son paiement.", {
      status: 403,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const { pathname } = request.nextUrl;
  const espace = pathname.startsWith("/admin")
    ? "admin"
    : pathname.startsWith("/membre")
      ? "membre"
      : null;
  if (!espace) return NextResponse.next();

  // Fonction que l'offre de la Chambre n'inclut pas (réglée par l'Admin GM)
  const fonction = fonctionDuChemin(pathname);
  if (fonction && ici.fonctions && !ici.fonctions.includes(fonction)) {
    const accueil = request.nextUrl.clone();
    accueil.pathname = `/${espace}`;
    accueil.search = new URLSearchParams({ msg: "Cette fonction n’est pas incluse dans l’offre de la Chambre.", ton: "erreur" }).toString();
    return NextResponse.redirect(accueil);
  }

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
  // Visite de l'Admin GM (mode développeur) : une session de visite ne vaut qu'avec son cookie, et cesse dès que
  // la Chambre retire l'autorisation ; un cookie de visite avec une session ordinaire ne vaut rien non plus
  const cookieVisite = request.cookies.get(NOM_COOKIE_VISITE)?.value;
  if (session.visite || cookieVisite) {
    const visite = lireVisite(cookieVisite);
    if (!session.visite || !visite || !ici.accesDev || visite.u !== session.userId) {
      const reponse = vers(CONNEXION);
      reponse.cookies.delete(NOM_COOKIE);
      reponse.cookies.delete(NOM_COOKIE_VISITE);
      return reponse;
    }
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
