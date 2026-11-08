import { num } from '@/lib/api-helpers';
import { avecMembre } from '@/lib/espace';
import { commenter } from '@/lib/news-membres';

type Ctx = { params: Promise<{ id: string }> };
export const POST = (req: Request, { params }: Ctx) => avecMembre(async m => {
  const b = await req.json().catch(() => ({}));
  const c = await commenter(m, num((await params).id), b.texte, Number(b.parent_id) || null);
  return Response.json(c, { status: 201 });
});
