import { notFound } from '@/lib/crud';
import { num, withUser } from '@/lib/api-helpers';
import { reactComment } from '@/lib/news';

// { emoji } : réaction à un commentaire
export async function POST(req: Request, { params }: { params: Promise<{ cid: string }> }) {
  const cid = num((await params).cid);
  if (Number.isNaN(cid)) return notFound();
  return withUser(async u => { await reactComment(u, cid, String((await req.json()).emoji ?? '')); return Response.json({ ok: true }); });
}
