import { avecMembre } from '@/lib/espace';
import { charger, enregistrer } from '@/lib/maillage-serveur';

// Le questionnaire de maillage de l'entreprise du membre connecté (mêmes réponses que le lien personnel)
export const GET = () => avecMembre(async m => {
  const { jeton: _, rempli_par: __, ...d } = await charger(m.member_id);
  return Response.json(d);
});

export const PUT = (req: Request) => avecMembre(async m =>
  Response.json(await enregistrer(m.member_id, await req.json().catch(() => ({})), `Membre · ${m.nom}`)));
