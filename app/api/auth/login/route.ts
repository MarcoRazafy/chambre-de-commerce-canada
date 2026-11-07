import { fail } from '@/lib/db';
import { connecterEquipe } from '@/lib/auth';
import { connecter } from '@/lib/espace';
import { journal } from '@/lib/hooks';
import { MsgError } from '@/lib/messaging';

// Une seule porte : un compte de l'équipe ouvre le back-office ; un contact membre est dirigé vers son espace
export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  const e = String(email ?? ''), p = String(password ?? '');
  try {
    const u = await connecterEquipe(e, p);
    if (u) { await journal('Équipe', 'Connexion', null, u.nom); return Response.json({ ok: true, vers: '/' }); }
    try {
      const c = await connecter(e, p);
      await journal('Adhésions', 'Connexion', 'Espace membre', c.nom);
      return Response.json({ ok: true, vers: c.vers });
    } catch (x) {
      if (x instanceof MsgError) return Response.json({ error: 'Courriel ou mot de passe incorrect. Nouveau compte ? Demandez à un administrateur de définir votre mot de passe.' }, { status: 401 });
      throw x;
    }
  } catch (x) {
    return fail(x);
  }
}
