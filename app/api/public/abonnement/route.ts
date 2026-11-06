import { q, fail } from '@/lib/db';
import { journal } from '@/lib/hooks';

// Inscription publique à la lettre d'information (page /inscription)
export async function POST(req: Request) {
  const { email, nom, site } = await req.json().catch(() => ({}));
  if (site) return Response.json({ ok: true });                // champ piège anti-robots
  const e = String(email ?? '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) || e.length > 200) return Response.json({ error: 'Adresse de courriel invalide' }, { status: 400 });
  try {
    await q(`insert into subscribers (email, nom, source) values ($1, $2, 'Page publique')
             on conflict (email) do update set statut = 'Abonné', nom = coalesce(subscribers.nom, excluded.nom)`, [e, String(nom ?? '').trim().slice(0, 120) || null]);
    await journal('Communication', 'Inscription à la newsletter', e, 'Visiteur');
    return Response.json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
