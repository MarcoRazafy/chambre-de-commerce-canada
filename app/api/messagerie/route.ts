import { withUser } from '@/lib/api-helpers';
import { createThread, listThreads } from '@/lib/messaging';

// Liste des conversations : ?filtre=tous|non-lus|importants|membres|groupes|equipe|archivees&q=texte&member_id=5
export async function GET(req: Request) {
  return withUser(async u => {
    const sp = new URL(req.url).searchParams;
    const member = Number(sp.get('member_id')) || undefined;
    return Response.json(await listThreads(u, { filtre: sp.get('filtre') ?? 'tous', q: sp.get('q') ?? '', member_id: member }));
  });
}

// Nouvelle conversation : { user_ids: [], member_ids: [], sujet? } (le premier message part ensuite via POST /api/messagerie/<id>)
export async function POST(req: Request) {
  return withUser(async u => Response.json(await createThread(u, await req.json()), { status: 201 }));
}
