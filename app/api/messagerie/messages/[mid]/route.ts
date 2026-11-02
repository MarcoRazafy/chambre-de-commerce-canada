import { notFound } from '@/lib/crud';
import { num, withUser } from '@/lib/api-helpers';
import { editMessage } from '@/lib/messaging';

type Ctx = { params: Promise<{ mid: string }> };

// Modifier son propre message : { texte }
export async function PATCH(req: Request, { params }: Ctx) {
  const mid = num((await params).mid);
  if (Number.isNaN(mid)) return notFound();
  return withUser(async u => { await editMessage(u, mid, String((await req.json()).texte ?? '')); return Response.json({ ok: true }); });
}

// Supprimer son propre message (il reste affiché « Message supprimé »)
export async function DELETE(_req: Request, { params }: Ctx) {
  const mid = num((await params).mid);
  if (Number.isNaN(mid)) return notFound();
  return withUser(async u => { await editMessage(u, mid, null); return new Response(null, { status: 204 }); });
}
