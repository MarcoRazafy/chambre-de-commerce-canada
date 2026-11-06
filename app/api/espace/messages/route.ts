import { avecMembre } from '@/lib/espace';
import { conversations, ecrireChambre } from '@/lib/espace-donnees';

// GET : les conversations de l'entreprise avec la Chambre ; POST : écrire à la Chambre
export const GET = () => avecMembre(async m => Response.json(await conversations(m)));
export const POST = (req: Request) => avecMembre(async m => {
  const b = await req.json().catch(() => ({}));
  return Response.json({ id: await ecrireChambre(m, String(b.texte ?? '')) }, { status: 201 });
});
