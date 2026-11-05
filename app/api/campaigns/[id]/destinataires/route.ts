import { notFound } from '@/lib/crud';
import { num, withUser } from '@/lib/api-helpers';
import { destinatairesLettre } from '@/lib/audiences';

// Destinataires d'une lettre (pas encore envoyée) : { inclure, exclure, mode, contacts }
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = num((await params).id);
  if (Number.isNaN(id)) return notFound();
  return withUser(async u => Response.json(await destinatairesLettre(u, id, await req.json().catch(() => ({})))));
}
