import { notFound } from '@/lib/crud';
import { fileResponse, num } from '@/lib/api-helpers';
import { avecMembre } from '@/lib/espace';
import { fichierMessage } from '@/lib/espace-donnees';

// Pièce jointe d'un message d'une conversation de l'entreprise
export async function GET(req: Request, { params }: { params: Promise<{ fid: string }> }) {
  const fid = num((await params).fid);
  if (Number.isNaN(fid)) return notFound();
  return avecMembre(async m => { const f = await fichierMessage(m, fid); return f ? fileResponse(req, f) : notFound(); });
}
