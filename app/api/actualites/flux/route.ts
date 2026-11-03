import { withUser } from '@/lib/api-helpers';
import { feed } from '@/lib/news';

// Fil complet : chaque actualité avec ses médias, réactions et commentaires
export async function GET() {
  return withUser(async u => Response.json(await feed(u)));
}
