import { withUser } from '@/lib/api-helpers';
import { MsgError } from '@/lib/messaging';
import { accesRessources, coller, extreme, listeIds, ordonner } from '@/lib/ressources';

// Rangement et accès : { op: 'ordonner' | 'premier' | 'dernier' | 'coller' | 'ouvrir' | 'retirer', ... }
export const POST = (req: Request) => withUser(async u => {
  const b = await req.json().catch(() => ({}));
  const dossier = b.dossier_id == null || b.dossier_id === '' ? null : Number(b.dossier_id);
  if (dossier !== null && !(Number.isInteger(dossier) && dossier > 0)) throw new MsgError('Dossier illisible');
  if (b.op === 'ordonner') { await ordonner(dossier, listeIds(b.ids)); return Response.json({ ok: true }); }
  if (b.op === 'premier' || b.op === 'dernier') { await extreme(Number(b.id), b.op); return Response.json({ ok: true }); }
  if (b.op === 'coller') return Response.json({ n: await coller(u, listeIds(b.ids), b.mode === 'couper' ? 'couper' : 'copier', dossier) });
  if (b.op === 'ouvrir' || b.op === 'retirer') return Response.json({ n: await accesRessources(u, listeIds(b.ids), listeIds(b.membres), b.op === 'ouvrir') });
  throw new MsgError('Action inconnue');
});
