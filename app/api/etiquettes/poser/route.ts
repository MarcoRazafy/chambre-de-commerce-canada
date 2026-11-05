import { withUser } from '@/lib/api-helpers';
import { poser } from '@/lib/audiences';

// Poser (ou retirer, avec retirer: true) une étiquette sur des abonnés ou des membres :
// { cible: 'abonne' | 'membre', ids: [...], etiquette_id } ou { …, nom, couleur } pour la créer au passage
export const POST = (req: Request) => withUser(async u => Response.json(await poser(u, await req.json().catch(() => ({})))));
