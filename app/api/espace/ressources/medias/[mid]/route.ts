import { notFound } from '@/lib/crud';
import { fileResponse, num } from '@/lib/api-helpers';
import { avecMembre } from '@/lib/espace';
import { mediaRessource } from '@/lib/espace-donnees';

// Fichier d'une ressource ouverte à l'entreprise ; ?dl=1 le télécharge
export async function GET(req: Request, { params }: { params: Promise<{ mid: string }> }) {
  const mid = num((await params).mid);
  if (Number.isNaN(mid)) return notFound();
  return avecMembre(async m => { const f = await mediaRessource(m, mid); return f ? fileResponse(req, f) : notFound(); });
}
