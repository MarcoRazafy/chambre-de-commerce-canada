import { notFound } from '@/lib/crud';
import { num, withUser } from '@/lib/api-helpers';
import { addParticipants, removeParticipant } from '@/lib/messaging';

type Ctx = { params: Promise<{ id: string }> };

// Ajout de personnes : { user_ids, member_ids }. Sur une conversation à deux, crée un nouveau groupe et renvoie son id.
export async function POST(req: Request, { params }: Ctx) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  return withUser(async u => {
    const b = await req.json();
    const t = await addParticipants(u, id, (b.user_ids ?? []).map(Number), (b.member_ids ?? []).map(Number));
    return Response.json({ id: t.id });
  });
}

// Retrait : ?kind=user|member&ref=12 (soi-même = quitter le groupe)
export async function DELETE(req: Request, { params }: Ctx) {
  const id = num((await params).id);
  const sp = new URL(req.url).searchParams;
  const kind = sp.get('kind'), ref = num(sp.get('ref') ?? '');
  if (Number.isNaN(id) || (kind !== 'user' && kind !== 'member') || Number.isNaN(ref)) return notFound();
  return withUser(async u => { await removeParticipant(u, id, kind, ref); return new Response(null, { status: 204 }); });
}
