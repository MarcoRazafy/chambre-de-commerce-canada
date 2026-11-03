import { notFound } from '@/lib/crud';
import { fileResponse, num, withUser } from '@/lib/api-helpers';
import { mediaFile } from '@/lib/news';

// Photo ou vidéo d'une actualité (lecture vidéo avec avance rapide)
export async function GET(req: Request, { params }: { params: Promise<{ mid: string }> }) {
  const mid = num((await params).mid);
  if (Number.isNaN(mid)) return notFound();
  return withUser(async () => {
    const m = await mediaFile(mid);
    return fileResponse(req, { nom: m.nom, type: m.type, contenu: m.contenu });
  });
}
