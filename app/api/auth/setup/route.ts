import { pool, q, fail } from '@/lib/db';
import { hashPassword, openSession } from '@/lib/auth';
import { journal } from '@/lib/hooks';

// Premier démarrage : tant qu'aucun compte n'a de mot de passe, on peut créer le premier administrateur.
const needed = async () => (await q(`select 1 from team_users where password_hash is not null limit 1`)).length === 0;

export async function GET() {
  try {
    return Response.json({ needed: await needed() });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  const { nom, email, password } = await req.json();
  if (!nom?.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email ?? '')) return Response.json({ error: 'Nom et courriel valides requis' }, { status: 400 });
  if (String(password ?? '').length < 8) return Response.json({ error: 'Le mot de passe doit faire au moins 8 caractères' }, { status: 400 });
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query('lock table team_users in exclusive mode');   // deux créations simultanées impossibles
    const { rows } = await client.query('select 1 from team_users where password_hash is not null limit 1');
    if (rows.length) {
      await client.query('rollback');
      return Response.json({ error: 'Un administrateur existe déjà : connectez-vous' }, { status: 409 });
    }
    const { rows: [u] } = await client.query(
      `insert into team_users (nom, email, role, fonction, actif, password_hash) values ($1, lower($2), 'Administrateur', 'Administrateur', true, $3)
       on conflict (email) do update set role = 'Administrateur', actif = true, password_hash = excluded.password_hash returning id`,
      [nom.trim(), email.trim(), await hashPassword(password)]);
    await client.query('commit');
    await openSession(u.id);
    await journal('Équipe', 'Premier administrateur créé', email, nom.trim());
    return Response.json({ ok: true }, { status: 201 });
  } catch (e) {
    await client.query('rollback').catch(() => {});
    return fail(e);
  } finally {
    client.release();
  }
}
