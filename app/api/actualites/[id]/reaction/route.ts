import { notFound } from '@/lib/crud';
import { num, withUser } from '@/lib/api-helpers';
import { reactNews } from '@/lib/news';

// { emoji } : ajoute, change ou retire sa réaction à l'actualité
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  return withUser(async u => { await reactNews(u, id, String((await req.json()).emoji ?? '')); return Response.json({ ok: true }); });
}
