import { notFound } from '@/lib/crud';
import { num } from '@/lib/api-helpers';
import { avecMembre } from '@/lib/espace';
import { ressource } from '@/lib/espace-donnees';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  return avecMembre(async m => Response.json(await ressource(m, id)));
}
