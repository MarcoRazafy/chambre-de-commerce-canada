import { num, uploads } from '@/lib/api-helpers';
import { avecMembre } from '@/lib/espace';
import { MsgError } from '@/lib/messaging';
import { jsonList } from '@/lib/news';
import { modifier, supprimer } from '@/lib/news-membres';

type Ctx = { params: Promise<{ id: string }> };
const ident = async (p: Ctx['params']) => { const id = num((await p).id); if (Number.isNaN(id)) throw new MsgError('Publication introuvable'); return id; };

// Modifier sa publication : texte, nouvelles photos, photos à retirer (« retirer », liste JSON)
export const PATCH = (req: Request, { params }: Ctx) => avecMembre(async m => {
  const form = await req.formData();
  await modifier(m, await ident(params), form.get('texte'), await uploads(form, 'photos'), jsonList(form.get('retirer')).map(Number).filter(Number.isInteger));
  return new Response(null, { status: 204 });
});

export const DELETE = (_req: Request, { params }: Ctx) => avecMembre(async m => {
  await supprimer(m, await ident(params));
  return new Response(null, { status: 204 });
});
