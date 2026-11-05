import { notFound } from '@/lib/crud';
import { num, withUser } from '@/lib/api-helpers';
import { modifierEtiquette, supprimerEtiquette } from '@/lib/audiences';

type P = { params: Promise<{ id: string }> };

// Renommer ou recolorer une étiquette ; la supprimer la retire de tout le monde
export async function PATCH(req: Request, { params }: P) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  return withUser(async u => Response.json(await modifierEtiquette(u, id, await req.json().catch(() => ({})))));
}

export async function DELETE(_: Request, { params }: P) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  return withUser(async u => { await supprimerEtiquette(u, id); return Response.json({ ok: true }); });
}
