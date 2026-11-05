import { notFound } from '@/lib/crud';
import { num, withUser } from '@/lib/api-helpers';
import { historique } from '@/lib/membres';

// Historique d'un membre : actions du journal qui le citent, lui ou ses factures
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  return withUser(async () => Response.json(await historique(id)));
}
