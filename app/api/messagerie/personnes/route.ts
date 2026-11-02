import { withUser } from '@/lib/api-helpers';
import { people } from '@/lib/messaging';

// Destinataires possibles (collègues et membres) : ?q=texte
export async function GET(req: Request) {
  return withUser(async u => Response.json(await people(u, new URL(req.url).searchParams.get('q') ?? '')));
}
