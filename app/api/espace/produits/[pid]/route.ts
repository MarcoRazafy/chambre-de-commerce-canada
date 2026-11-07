import { q } from '@/lib/db';
import { num, uploads } from '@/lib/api-helpers';
import { avecMembre, type Membre } from '@/lib/espace';
import { deleteProduit, updateProduit } from '@/lib/membres';
import { jsonList } from '@/lib/news';
import { MsgError } from '@/lib/messaging';
import { auteur } from '@/lib/espace-donnees';

type Ctx = { params: Promise<{ pid: string }> };
// Une offre ne se modifie que depuis l'entreprise qui la propose
async function sienne(m: Membre, params: Ctx['params']) {
  const pid = num((await params).pid);
  if (Number.isNaN(pid) || !(await q('select 1 from produits where id = $1 and member_id = $2', [pid, m.member_id])).length) throw new MsgError('Offre introuvable');
  return pid;
}

export const PATCH = (req: Request, { params }: Ctx) => avecMembre(async m => {
  const pid = await sienne(m, params);
  const form = await req.formData();
  await updateProduit(auteur(m), pid, form, await uploads(form, 'photos'), jsonList(form.get('retirer')).map(Number).filter(Number.isInteger));
  return new Response(null, { status: 204 });
});

export const DELETE = (_req: Request, { params }: Ctx) => avecMembre(async m => {
  await deleteProduit(auteur(m), await sienne(m, params));
  return new Response(null, { status: 204 });
});
