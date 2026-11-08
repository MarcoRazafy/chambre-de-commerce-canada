import { uploads } from '@/lib/api-helpers';
import { avecMembre } from '@/lib/espace';
import { fil, publier } from '@/lib/news-membres';

// Fil des actualités (Chambre et membres), avec réactions et commentaires
export const GET = () => avecMembre(async m => Response.json(await fil(m)));

// Nouvelle publication du membre : texte et jusqu'à 10 photos (formulaire multipart « texte », « photos »)
export const POST = (req: Request) => avecMembre(async m => {
  const form = await req.formData();
  return Response.json({ id: await publier(m, form.get('texte'), await uploads(form, 'photos')) }, { status: 201 });
});
