import { num } from '@/lib/api-helpers';
import { avecMembre } from '@/lib/espace';
import { modifierContact, retirerContact } from '@/lib/espace-donnees';
import { MsgError } from '@/lib/messaging';

type Ctx = { params: Promise<{ cid: string }> };
const ident = async (params: Ctx['params']) => {
  const id = num((await params).cid);
  if (Number.isNaN(id)) throw new MsgError('Contact introuvable');
  return id;
};

export const PATCH = (req: Request, { params }: Ctx) => avecMembre(async m => {
  await modifierContact(m, await ident(params), await req.json().catch(() => ({})));
  return Response.json({ id: await ident(params) });
});

export const DELETE = (_req: Request, { params }: Ctx) => avecMembre(async m => {
  await retirerContact(m, await ident(params));
  return new Response(null, { status: 204 });
});
