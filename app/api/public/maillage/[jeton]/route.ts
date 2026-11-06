import { fail } from '@/lib/db';
import { MsgError } from '@/lib/messaging';
import { charger, enregistrer, parJeton } from '@/lib/maillage-serveur';

type Ctx = { params: Promise<{ jeton: string }> };
const introuvable = () => Response.json({ error: 'Ce lien n’est plus valable. Demandez-en un nouveau à la Chambre.' }, { status: 404 });

// Page publique du questionnaire (lien personnel, sans compte) : le membre ne voit et ne modifie que ses réponses
export async function GET(_req: Request, { params }: Ctx) {
  const id = await parJeton((await params).jeton);
  if (!id) return introuvable();
  try {
    const { jeton: _, rempli_par: __, ...d } = await charger(id);
    return Response.json(d);
  } catch (e) { return fail(e); }
}

export async function PUT(req: Request, { params }: Ctx) {
  const id = await parJeton((await params).jeton);
  if (!id) return introuvable();
  const corps = await req.text();
  if (corps.length > 100_000) return Response.json({ error: 'Réponses trop longues' }, { status: 413 });
  try {
    return Response.json(await enregistrer(id, JSON.parse(corps || '{}'), 'Le membre'));
  } catch (e) {
    return e instanceof MsgError ? Response.json({ error: e.message }, { status: 400 }) : e instanceof SyntaxError ? Response.json({ error: 'Réponses illisibles' }, { status: 400 }) : fail(e);
  }
}
