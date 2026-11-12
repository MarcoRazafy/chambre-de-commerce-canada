import { NextResponse, type NextRequest } from "next/server";
import { lireSession, NOM_COOKIE, sessionPerimee } from "@/lib/auth";
// Avant la page, la Chambre n'est pas encore établie : lectures par identifiant (session signée), sans limite
import { prismaSysteme as prisma } from "@/lib/db";
import { isAccessLocked, PAGES_TOUJOURS_OUVERTES } from "@/lib/membership";

const TOUJOURS_OUVERT = PAGES_TOUJOURS_OUVERTES;
const REPLI = "/membre/profil";
const CONNEXION = "/auth";

const DOMAINE = process.env.DOMAINE_PRINCIPAL?.trim().toLowerCase() || null;

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

export default async function proxy(request: NextRequest) {
  const canonique = versDomainePrincipal(request);
  if (canonique) return canonique;

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
    select: { role: true, memberId: true, motDePasseModifieLe: true },
  });
  if (!user || sessionPerimee(session, user.motDePasseModifieLe)) {
    return vers(CONNEXION);
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
