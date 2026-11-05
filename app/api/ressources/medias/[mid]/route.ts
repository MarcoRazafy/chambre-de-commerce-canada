import { notFound } from '@/lib/crud';
import { fileResponse, num, withUser } from '@/lib/api-helpers';
import { getMedia } from '@/lib/ressources';

// Fichier de la bibliothèque, lu par le lecteur du navigateur (PDF, vidéo, photo) ; ?dl=1 le télécharge
export async function GET(req: Request, { params }: { params: Promise<{ mid: string }> }) {
  const mid = num((await params).mid);
  if (Number.isNaN(mid)) return notFound();
  return withUser(async () => {
    const f = await getMedia(mid);
    return f ? fileResponse(req, f) : notFound();
  });
}
