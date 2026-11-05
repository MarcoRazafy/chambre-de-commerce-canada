import { notFound } from '@/lib/crud';
import { num, withUser } from '@/lib/api-helpers';
import { deleteNote } from '@/lib/membres';

// Retirer un commentaire de l'équipe
export async function DELETE(_req: Request, { params }: { params: Promise<{ nid: string }> }) {
  const nid = num((await params).nid);
  if (Number.isNaN(nid)) return notFound();
  return withUser(async () => { await deleteNote(nid); return new Response(null, { status: 204 }); });
}
