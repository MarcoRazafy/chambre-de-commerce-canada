import { num } from '@/lib/api-helpers';
import { avecMembre } from '@/lib/espace';
import { reagirCommentaire } from '@/lib/news-membres';

type Ctx = { params: Promise<{ cid: string }> };
export const POST = (req: Request, { params }: Ctx) => avecMembre(async m => {
  const { emoji } = await req.json().catch(() => ({}));
  await reagirCommentaire(m, num((await params).cid), String(emoji ?? ''));
  return new Response(null, { status: 204 });
});
