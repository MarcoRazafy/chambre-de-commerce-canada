import { num } from '@/lib/api-helpers';
import { avecMembre } from '@/lib/espace';
import { reagir } from '@/lib/news-membres';

type Ctx = { params: Promise<{ id: string }> };
export const POST = (req: Request, { params }: Ctx) => avecMembre(async m => {
  const { emoji } = await req.json().catch(() => ({}));
  await reagir(m, num((await params).id), String(emoji ?? ''));
  return new Response(null, { status: 204 });
});
