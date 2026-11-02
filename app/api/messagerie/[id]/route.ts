import { notFound } from '@/lib/crud';
import { num, uploads, withUser } from '@/lib/api-helpers';
import { deleteThread, getThread, renameThread, sendMessage, setState } from '@/lib/messaging';

type Ctx = { params: Promise<{ id: string }> };

// Conversation complète (participants, messages, fiche du membre) ; la marque comme lue
export async function GET(_req: Request, { params }: Ctx) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  return withUser(async u => Response.json(await getThread(u, id)));
}

// Envoi d'un message : formulaire multipart avec « texte », des « files » et, pour noter une réponse reçue, « entrant » = id du membre
export async function POST(req: Request, { params }: Ctx) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  return withUser(async u => {
    const form = await req.formData();
    const entrant = Number(form.get('entrant')) || null;
    const msg = await sendMessage(u, id, String(form.get('texte') ?? ''), await uploads(form), entrant);
    return Response.json(msg, { status: 201 });
  });
}

// { sujet } renomme ; { important }, { archived }, { non_lu: true } changent l'état pour l'utilisateur
export async function PATCH(req: Request, { params }: Ctx) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  return withUser(async u => {
    const b = await req.json();
    if (typeof b.sujet === 'string') await renameThread(u, id, b.sujet);
    await setState(u, id, b);
    return Response.json({ ok: true });
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  return withUser(async u => { await deleteThread(u, id); return new Response(null, { status: 204 }); });
}
