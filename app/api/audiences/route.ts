import { withUser } from '@/lib/api-helpers';
import { enregistrerAudience, listeAudiences } from '@/lib/audiences';

// Audiences enregistrées : un choix d'étiquettes réutilisable
export const GET = () => withUser(async () => Response.json(await listeAudiences()));

export const POST = (req: Request) => withUser(async u => Response.json(await enregistrerAudience(u, null, await req.json().catch(() => ({})))));
