import { notFound } from '@/lib/crud';
import { num, withUser } from '@/lib/api-helpers';
import { deleteRessource, getRessource, saveRessource } from '@/lib/ressources';

type P = { params: Promise<{ id: string }> };

// Une ressource : lecture complète (blocs d'une page, fichier, accès, chemin), modification, suppression
export async function GET(_: Request, { params }: P) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  return withUser(async () => Response.json(await getRessource(id)));
}

export async function PATCH(req: Request, { params }: P) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  return withUser(async u => Response.json(await saveRessource(u, id, await req.json().catch(() => ({})))));
}

export async function DELETE(_: Request, { params }: P) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  return withUser(async u => { await deleteRessource(u, id); return Response.json({ ok: true }); });
}
