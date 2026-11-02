import { q, fail } from '@/lib/db';
import { guard } from '@/lib/auth';

// Utilisateur connecté + compteurs de la barre et du menu :
// notifications non lues, conversations dont le dernier message vient d'un membre (en attente de réponse), demandes d'adhésion
export async function GET() {
  const u = await guard();
  if (u instanceof Response) return u;
  try {
    const [c] = await q<{ notifs: number; messages: number; demandes: number }>(
      `select (select count(*) from notifications where not lu)::int as notifs,
              (select count(*) from threads t where (select not de_nous from messages m where m.thread_id = t.id order by m.created_at desc limit 1))::int as messages,
              (select count(*) from members where statut = 'demande')::int as demandes`);
    return Response.json({ user: u, ...c });
  } catch (e) {
    return fail(e);
  }
}
