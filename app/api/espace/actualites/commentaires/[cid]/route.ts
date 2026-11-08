import { num } from '@/lib/api-helpers';
import { avecMembre } from '@/lib/espace';
import { modifierCommentaire, supprimerCommentaire } from '@/lib/news-membres';

type Ctx = { params: Promise<{ cid: string }> };
export const PATCH = (req: Request, { params }: Ctx) => avecMembre(async m => {
  const b = await req.json().catch(() => ({}));
  await modifierCommentaire(m, num((await params).cid), b.texte);
  return new Response(null, { status: 204 });
});
export const DELETE = (_req: Request, { params }: Ctx) => avecMembre(async m => {
  await supprimerCommentaire(m, num((await params).cid));
  return new Response(null, { status: 204 });
});
