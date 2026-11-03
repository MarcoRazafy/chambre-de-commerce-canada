import { notFound } from '@/lib/crud';
import { num, withUser } from '@/lib/api-helpers';
import { addComment } from '@/lib/news';

// { texte, parent_id? } : nouveau commentaire, ou réponse à un commentaire
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  return withUser(async u => {
    const b = await req.json();
    return Response.json(await addComment(u, id, String(b.texte ?? ''), Number(b.parent_id) || null), { status: 201 });
  });
}
