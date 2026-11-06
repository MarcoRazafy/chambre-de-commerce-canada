import { NextResponse, type NextRequest } from 'next/server';

// Première barrière : sans cookie de session, on renvoie vers /connexion.
// La validité de la session est vérifiée ensuite par chaque route (lib/auth.ts).
const PUBLIC = ['/connexion', '/inscription', '/desabonnement', '/questionnaire', '/api/auth/', '/api/public/', '/api/cron'];

// Espace membre : sa propre connexion (cookie cc_membre) ; la session de l'équipe n'y donne pas accès, et inversement
const ESPACE_LIBRE = ['/espace/connexion', '/api/espace/connexion'];

export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path === '/espace' || path.startsWith('/espace/') || path.startsWith('/api/espace/')) {
    if (ESPACE_LIBRE.includes(path) || req.cookies.has('cc_membre')) return NextResponse.next();
    if (path.startsWith('/api/')) return NextResponse.json({ error: 'Connexion requise' }, { status: 401 });
    return NextResponse.redirect(new URL('/connexion', req.url));
  }
  // Logos et photos : lisibles aussi depuis l'espace membre (la route vérifie la session)
  if (path.startsWith('/api/avatar/') && req.cookies.has('cc_membre')) return NextResponse.next();
  if (PUBLIC.some(p => path === p || path.startsWith(p.endsWith('/') ? p : p + '/')) || req.cookies.has('cc_session'))
    return NextResponse.next();
  if (path.startsWith('/api/')) return NextResponse.json({ error: 'Connexion requise' }, { status: 401 });
  return NextResponse.redirect(new URL('/connexion', req.url));
}

export const config = {
  // Les images publiques (logo, icônes de l'application) restent accessibles sans connexion
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)'],
};
