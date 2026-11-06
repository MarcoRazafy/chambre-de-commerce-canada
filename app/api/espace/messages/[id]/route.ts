import { notFound } from '@/lib/crud';
import { num } from '@/lib/api-helpers';
import { avecMembre } from '@/lib/espace';
import { conversation, ecrire } from '@/lib/espace-donnees';

type Ctx = { params: Promise<{ id: string }> };
export async function GET(_req: Request, { params }: Ctx) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  return avecMembre(async m => Response.json(await conversation(m, id)));
}
export async function POST(req: Request, { params }: Ctx) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  return avecMembre(async m => {
    const b = await req.json().catch(() => ({}));
    return Response.json(await ecrire(m, id, String(b.texte ?? '')), { status: 201 });
  });
}
