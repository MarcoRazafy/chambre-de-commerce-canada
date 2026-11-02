import { q, fail } from '@/lib/db';
import { openSession, verifyPassword } from '@/lib/auth';
import { journal } from '@/lib/hooks';

export async function POST(req: Request) {
  const { email, password } = await req.json();
  try {
    const [u] = await q<{ id: number; nom: string; actif: boolean; password_hash: string | null }>(
      'select id, nom, actif, password_hash from team_users where lower(email) = lower($1)', [String(email ?? '').trim()]);
    // Même réponse et même durée de calcul que le compte existe ou non
    const ok = await verifyPassword(String(password ?? ''), u?.password_hash ?? 'aa:' + '0'.repeat(128));
    if (!u || !ok || !u.actif) return Response.json({ error: 'Courriel ou mot de passe incorrect' }, { status: 401 });
    await openSession(u.id);
    await journal('Équipe', 'Connexion', null, u.nom);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
