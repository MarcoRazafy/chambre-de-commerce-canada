import { q, fail } from '@/lib/db';
import { journal } from '@/lib/hooks';

// Lien de désabonnement des lettres : { t: jeton }
export async function POST(req: Request) {
  const { t } = await req.json().catch(() => ({}));
  if (!/^[0-9a-f]{32}$/.test(String(t ?? ''))) return Response.json({ error: 'Lien invalide' }, { status: 400 });
  try {
    const [s] = await q<{ email: string }>(`update subscribers set statut = 'Désabonné' where jeton = $1 returning email`, [t]);
    if (!s) return Response.json({ error: 'Lien invalide ou expiré' }, { status: 404 });
    await journal('Communication', 'Désabonnement de la lettre', s.email, 'Visiteur');
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
