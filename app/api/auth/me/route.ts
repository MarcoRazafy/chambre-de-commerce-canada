import { q, fail } from '@/lib/db';
import { guard } from '@/lib/auth';
import { unreadCount } from '@/lib/messaging';

// Utilisateur connecté + compteurs de la barre et du menu :
// notifications non lues, conversations non lues par cet utilisateur, demandes d'adhésion, règlements à vérifier, nom de la chambre
export async function GET() {
  const u = await guard();
  if (u instanceof Response) return u;
  try {
    const [c] = await q<{ notifs: number; demandes: number; reglements: number; org: string | null }>(
      `select (select count(*) from notifications where not lu)::int as notifs, (select count(*) from members where statut = 'demande')::int as demandes,
              (select count(*) from reglements where statut = 'annoncé')::int as reglements,
              (select coalesce(valeur->>'court', valeur->>'nom') from settings where cle = 'org') as org`);
    return Response.json({ user: u, ...c, messages: await unreadCount(u) });
  } catch (e) {
    return fail(e);
  }
}
