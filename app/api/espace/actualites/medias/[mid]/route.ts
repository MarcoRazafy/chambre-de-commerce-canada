import { notFound } from '@/lib/crud';
import { fileResponse, num } from '@/lib/api-helpers';
import { avecMembre } from '@/lib/espace';
import { mediaActualite } from '@/lib/espace-donnees';

// Photo ou fichier d'une actualité publiée
export async function GET(req: Request, { params }: { params: Promise<{ mid: string }> }) {
  const mid = num((await params).mid);
  if (Number.isNaN(mid)) return notFound();
  return avecMembre(async () => { const f = await mediaActualite(mid); return f ? fileResponse(req, f) : notFound(); });
}
