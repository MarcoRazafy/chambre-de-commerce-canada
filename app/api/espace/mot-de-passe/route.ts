import { q } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { avecMembre } from '@/lib/espace';
import { MsgError } from '@/lib/messaging';

// Changer son mot de passe (l'ancien est demandé)
export const POST = (req: Request) => avecMembre(async m => {
  const { ancien, nouveau } = await req.json().catch(() => ({}));
  if (String(nouveau ?? '').length < 8) throw new MsgError('Le nouveau mot de passe doit faire au moins 8 caractères');
  const [c] = await q<{ password_hash: string }>('select password_hash from contacts where id = $1', [m.contact_id]);
  if (!(await verifyPassword(String(ancien ?? ''), c?.password_hash ?? null))) throw new MsgError('Mot de passe actuel incorrect');
  await q('update contacts set password_hash = $2 where id = $1', [m.contact_id, await hashPassword(String(nouveau))]);
  return Response.json({ ok: true });
});
