import { notFound } from '@/lib/crud';
import { num, uploads, withUser } from '@/lib/api-helpers';
import { deleteProduit, updateProduit } from '@/lib/membres';
import { jsonList } from '@/lib/news';

type Ctx = { params: Promise<{ pid: string }> };

// Modifier une offre : champs, nouvelles photos (« photos »), photos à retirer (« retirer », liste JSON d'identifiants)
export async function PATCH(req: Request, { params }: Ctx) {
  const pid = num((await params).pid);
  if (Number.isNaN(pid)) return notFound();
  return withUser(async u => {
    const form = await req.formData();
    const retirer = jsonList(form.get('retirer')).map(Number).filter(Number.isInteger);
    await updateProduit(u, pid, form, await uploads(form, 'photos'), retirer);
    return new Response(null, { status: 204 });
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const pid = num((await params).pid);
  if (Number.isNaN(pid)) return notFound();
  return withUser(async u => { await deleteProduit(u, pid); return new Response(null, { status: 204 }); });
}
