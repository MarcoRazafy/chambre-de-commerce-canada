import { notFound } from '@/lib/crud';
import { num } from '@/lib/api-helpers';
import { avecMembre } from '@/lib/espace';
import { facture } from '@/lib/espace-donnees';

// Une facture de l'entreprise, avec les coordonnées de la Chambre (pour l'afficher et l'imprimer)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  return avecMembre(async m => Response.json(await facture(m, id)));
}
