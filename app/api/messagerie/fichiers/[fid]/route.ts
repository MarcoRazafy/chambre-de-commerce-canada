import { notFound } from '@/lib/crud';
import { fileResponse, num, withUser } from '@/lib/api-helpers';
import { fileFor } from '@/lib/messaging';

// Pièce jointe d'un message (voir fileResponse : affichage, téléchargement, lecture vidéo)
export async function GET(req: Request, { params }: { params: Promise<{ fid: string }> }) {
  const fid = num((await params).fid);
  if (Number.isNaN(fid)) return notFound();
  return withUser(async u => {
    const f = await fileFor(u, fid);
    return fileResponse(req, { nom: f.nom, type: f.type, contenu: f.contenu as Buffer });
  });
}
