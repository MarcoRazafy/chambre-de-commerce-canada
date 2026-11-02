import { NextResponse, type NextRequest } from 'next/server';

// Première barrière : sans cookie de session, on renvoie vers /connexion.
// La validité de la session est vérifiée ensuite par chaque route (lib/auth.ts).
const PUBLIC = ['/connexion', '/inscription', '/desabonnement', '/api/auth/', '/api/public/', '/api/cron'];

export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (PUBLIC.some(p => path === p || path.startsWith(p.endsWith('/') ? p : p + '/')) || req.cookies.has('cc_session'))
    return NextResponse.next();
  if (path.startsWith('/api/')) return NextResponse.json({ error: 'Connexion requise' }, { status: 401 });
  return NextResponse.redirect(new URL('/connexion', req.url));
}

export const config = {
  // Les images publiques (logo, icônes de l'application) restent accessibles sans connexion
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)'],
};
