import { notFound } from '@/lib/crud';
import { num, uploads, withUser } from '@/lib/api-helpers';
import { createProduit, listProduits } from '@/lib/membres';

type Ctx = { params: Promise<{ id: string }> };

// Catalogue « Produits & services » d'un membre
export async function GET(_req: Request, { params }: Ctx) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  return withUser(async () => Response.json(await listProduits(id)));
}

// Nouvelle offre : formulaire multipart (label, type, prix, description, photos)
export async function POST(req: Request, { params }: Ctx) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  return withUser(async u => {
    const form = await req.formData();
    return Response.json({ id: await createProduit(u, id, form, await uploads(form, 'photos')) }, { status: 201 });
  });
}
