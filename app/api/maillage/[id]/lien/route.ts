import { notFound } from '@/lib/crud';
import { num, withUser } from '@/lib/api-helpers';
import { desactiver, lien } from '@/lib/maillage-serveur';

type Ctx = { params: Promise<{ id: string }> };

// Lien personnel du membre : POST le crée (ou le renvoie s'il existe), POST ?nouveau=1 le remplace, DELETE le désactive
export async function POST(req: Request, { params }: Ctx) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  const nouveau = new URL(req.url).searchParams.get('nouveau') === '1';
  return withUser(async () => Response.json({ jeton: await lien(id, nouveau) }));
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  return withUser(async () => { await desactiver(id); return Response.json({ ok: true }); });
}
