import { connecterEquipe } from '@/lib/auth';
import { connecter } from '@/lib/espace';
import { journal } from '@/lib/hooks';
import { MsgError } from '@/lib/messaging';

// Connexion depuis la page de l'espace membre ; un compte de l'équipe y est accepté aussi et envoyé au back-office
export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  const e = String(email ?? ''), p = String(password ?? '');
  try {
    const c = await connecter(e, p);
    await journal('Adhésions', 'Connexion', 'Espace membre', c.nom);
    return Response.json({ ok: true, vers: '/espace/demarrage' });
  } catch (x) {
    if (!(x instanceof MsgError)) return Response.json({ error: 'Connexion impossible pour le moment' }, { status: 500 });
    const u = await connecterEquipe(e, p).catch(() => null);
    if (u) { await journal('Équipe', 'Connexion', null, u.nom); return Response.json({ ok: true, vers: '/' }); }
    return Response.json({ error: x.message }, { status: 401 });
  }
}
