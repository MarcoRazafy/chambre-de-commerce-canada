import { uploads, withUser } from '@/lib/api-helpers';
import { MsgError } from '@/lib/messaging';
import { saveMedia } from '@/lib/ressources';

// Dépôt d'un fichier de la bibliothèque (document, vidéo, photo, couverture, média d'une page) : champ « file »
export const POST = (req: Request) => withUser(async () => {
  const form = await req.formData().catch(() => null);
  if (!form) throw new MsgError('Envoi illisible : le fichier dépasse peut-être 100 Mo');
  const [f] = await uploads(form, 'file');
  if (!f) throw new MsgError('Aucun fichier reçu');
  return Response.json(await saveMedia(f));
});
