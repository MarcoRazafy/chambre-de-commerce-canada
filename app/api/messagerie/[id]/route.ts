import { q, fail } from '@/lib/db';
import { notFound, validId } from '@/lib/crud';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!validId(id)) return notFound();
  try {
    return Response.json(await q('select * from messages where thread_id = $1 order by created_at', [Number(id)]));
  } catch (e) {
    return fail(e);
  }
}

// Ajoute un message : { texte, de_nous? } — de_nous vaut true par défaut (réponse de la chambre)
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!validId(id)) return notFound();
  const { texte, de_nous = true } = await req.json();
  if (!texte?.trim()) return Response.json({ error: 'Message vide' }, { status: 400 });
  try {
    const [row] = await q('insert into messages (thread_id, de_nous, texte) values ($1, $2, $3) returning *', [Number(id), !!de_nous, texte.trim()]);
    return Response.json(row, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
