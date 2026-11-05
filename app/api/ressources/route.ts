import { withUser } from '@/lib/api-helpers';
import { bibliotheque, saveRessource } from '@/lib/ressources';

// Toute la bibliothèque (dossiers, ressources, entreprises pour les accès) ; POST : nouvelle ressource
export const GET = () => withUser(async () => Response.json(await bibliotheque()));

export const POST = (req: Request) => withUser(async u => Response.json(await saveRessource(u, null, await req.json().catch(() => ({})))));
