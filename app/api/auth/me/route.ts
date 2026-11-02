import { q, fail } from '@/lib/db';
import { guard } from '@/lib/auth';

// Utilisateur connecté + compteurs du menu (notifications non lues, demandes d'adhésion)
export async function GET() {
  const u = await guard();
  if (u instanceof Response) return u;
  try {
    const [c] = await q<{ notifs: number; demandes: number }>(
      `select (select count(*) from notifications where not lu)::int as notifs, (select count(*) from members where statut = 'demande')::int as demandes`);
    return Response.json({ user: u, ...c });
  } catch (e) {
    return fail(e);
  }
}
