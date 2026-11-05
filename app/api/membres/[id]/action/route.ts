import { notFound } from '@/lib/crud';
import { num, withUser } from '@/lib/api-helpers';
import { MsgError } from '@/lib/messaging';
import { deleteMember, reconsider, refuseWithComment, registerPayment } from '@/lib/membres';

// Actions de la fiche membre : { op: 'payer' | 'refuser' | 'reconsiderer' | 'supprimer', ... }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  return withUser(async u => {
    const b = await req.json().catch(() => ({}));
    const message =
      b.op === 'payer' ? await registerPayment(u, id, b)
      : b.op === 'refuser' ? await refuseWithComment(u, id, String(b.commentaire ?? ''))
      : b.op === 'reconsiderer' ? await reconsider(u, id)
      : b.op === 'supprimer' ? await deleteMember(u, id)
      : null;
    if (!message) throw new MsgError('Action inconnue');
    return Response.json({ message });
  });
}
