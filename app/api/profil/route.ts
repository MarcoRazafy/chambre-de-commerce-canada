import { q } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { journal } from '@/lib/hooks';
import { withUser } from '@/lib/api-helpers';
import { MsgError } from '@/lib/messaging';

// Mon profil : { nom, fonction } et, pour changer de mot de passe, { actuel, nouveau }
export async function PATCH(req: Request) {
  return withUser(async u => {
    const b = await req.json();
    if (typeof b.nom === 'string') {
      if (!b.nom.trim()) throw new MsgError('Le nom ne peut pas être vide');
      await q('update team_users set nom = $2, fonction = $3 where id = $1', [u.id, b.nom.trim(), String(b.fonction ?? '').trim() || null]);
    }
    if (b.nouveau) {
      const [r] = await q<{ password_hash: string }>('select password_hash from team_users where id = $1', [u.id]);
      if (!(await verifyPassword(String(b.actuel ?? ''), r.password_hash))) throw new MsgError('Mot de passe actuel incorrect');
      if (String(b.nouveau).length < 8) throw new MsgError('Le nouveau mot de passe doit faire au moins 8 caractères');
      await q('update team_users set password_hash = $2 where id = $1', [u.id, await hashPassword(String(b.nouveau))]);
      await journal('Équipe', 'Mot de passe changé', null, u.nom);
    }
    return Response.json({ ok: true });
  });
}
