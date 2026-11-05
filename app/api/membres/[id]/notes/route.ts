import { notFound } from '@/lib/crud';
import { num, withUser } from '@/lib/api-helpers';
import { addNote, listNotes } from '@/lib/membres';

type Ctx = { params: Promise<{ id: string }> };

// Commentaires de l'équipe sur un membre (jamais visibles du membre)
export async function GET(_req: Request, { params }: Ctx) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  return withUser(async () => Response.json(await listNotes(id)));
}

export async function POST(req: Request, { params }: Ctx) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  return withUser(async u => {
    const b = await req.json().catch(() => ({}));
    return Response.json({ id: await addNote(u, id, String(b.texte ?? '')) }, { status: 201 });
  });
}
