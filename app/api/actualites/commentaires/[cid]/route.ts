import { notFound } from '@/lib/crud';
import { num, withUser } from '@/lib/api-helpers';
import { deleteComment, editComment } from '@/lib/news';

type Ctx = { params: Promise<{ cid: string }> };

// { texte } : modifie son commentaire
export async function PATCH(req: Request, { params }: Ctx) {
  const cid = num((await params).cid);
  if (Number.isNaN(cid)) return notFound();
  return withUser(async u => { await editComment(u, cid, String((await req.json()).texte ?? '')); return Response.json({ ok: true }); });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const cid = num((await params).cid);
  if (Number.isNaN(cid)) return notFound();
  return withUser(async u => { await deleteComment(u, cid); return new Response(null, { status: 204 }); });
}
