import { withUser } from '@/lib/api-helpers';
import { creerDossier } from '@/lib/ressources';

// Nouveau dossier : { nom, parent_id, restreint, acces: [member_id], cover, auteur_* }
export const POST = (req: Request) => withUser(async u => Response.json(await creerDossier(u, await req.json().catch(() => ({})))));
