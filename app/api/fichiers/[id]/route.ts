import { q, fail } from '@/lib/db';
import { guard } from '@/lib/auth';
import { journal } from '@/lib/hooks';
import { notFound, validId } from '@/lib/crud';

type Ctx = { params: Promise<{ id: string }> };

// Téléchargement
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!validId(id)) return notFound();
  const u = await guard();
  if (u instanceof Response) return u;
  try {
    const [f] = await q<{ nom: string; type: string; contenu: Buffer }>('select nom, type, contenu from fichiers where id = $1', [Number(id)]);
    if (!f) return notFound();
    return new Response(new Uint8Array(f.contenu), { headers: {
      'Content-Type': f.type,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(f.nom)}`,
      'X-Content-Type-Options': 'nosniff',
    } });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!validId(id)) return notFound();
  const u = await guard();
  if (u instanceof Response) return u;
  try {
    const [f] = await q<{ nom: string }>('delete from fichiers where id = $1 returning nom', [Number(id)]);
    if (!f) return notFound();
    await journal('Contenus', 'Fichier supprimé', f.nom, u.nom);
    return new Response(null, { status: 204 });
  } catch (e) {
    return fail(e);
  }
}
