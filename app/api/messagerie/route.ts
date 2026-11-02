import { q, pool, fail } from '@/lib/db';

// Liste des conversations avec le membre, son contact principal et le dernier message
export async function GET() {
  try {
    return Response.json(await q(`
      select t.id, t.sujet, t.member_id, m.nom as membre,
             (select c.nom from contacts c where c.member_id = m.id order by c.principal desc, c.id limit 1) as contact,
             l.texte as dernier, l.de_nous as dernier_de_nous, coalesce(l.created_at, t.created_at) as maj
      from threads t
      join members m on m.id = t.member_id
      left join lateral (select texte, de_nous, created_at from messages where thread_id = t.id order by created_at desc limit 1) l on true
      order by maj desc`));
  } catch (e) {
    return fail(e);
  }
}

// Nouvelle conversation : { member_id, sujet, texte }
export async function POST(req: Request) {
  const { member_id, sujet, texte } = await req.json();
  if (!member_id || !sujet?.trim() || !texte?.trim()) return Response.json({ error: 'Membre, sujet et message requis' }, { status: 400 });
  const client = await pool.connect();
  try {
    await client.query('begin');
    const { rows: [t] } = await client.query('insert into threads (member_id, sujet) values ($1, $2) returning *', [member_id, sujet.trim()]);
    await client.query('insert into messages (thread_id, de_nous, texte) values ($1, true, $2)', [t.id, texte.trim()]);
    await client.query('commit');
    return Response.json(t, { status: 201 });
  } catch (e) {
    await client.query('rollback');
    return fail(e);
  } finally {
    client.release();
  }
}
