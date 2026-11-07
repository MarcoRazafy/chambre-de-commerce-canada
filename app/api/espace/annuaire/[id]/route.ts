import { notFound } from '@/lib/crud';
import { num } from '@/lib/api-helpers';
import { avecMembre } from '@/lib/espace';
import { ficheMembre } from '@/lib/espace-donnees';

// Fiche d'un membre de l'annuaire (présentation publique et catalogue)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  return avecMembre(async () => Response.json(await ficheMembre(id)));
}
