import { notFound } from '@/lib/crud';
import { num, withUser } from '@/lib/api-helpers';
import { enregistrerAudience, supprimerAudience } from '@/lib/audiences';

type P = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: P) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  return withUser(async u => Response.json(await enregistrerAudience(u, id, await req.json().catch(() => ({})))));
}

export async function DELETE(_: Request, { params }: P) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  return withUser(async () => { await supprimerAudience(id); return Response.json({ ok: true }); });
}
