import { uploads } from '@/lib/api-helpers';
import { avecMembre } from '@/lib/espace';
import { auteur } from '@/lib/espace-donnees';
import { createProduit, listProduits } from '@/lib/membres';

// Le catalogue « Produits & services » de l'entreprise du membre connecté : il l'alimente lui-même
export const GET = () => avecMembre(async m => Response.json(await listProduits(m.member_id)));

export const POST = (req: Request) => avecMembre(async m => {
  const form = await req.formData();
  return Response.json({ id: await createProduit(auteur(m), m.member_id, form, await uploads(form, 'photos')) }, { status: 201 });
});
