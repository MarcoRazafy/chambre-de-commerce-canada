import { q, fail } from '@/lib/db';
import { guard } from '@/lib/auth';

// Recherche globale de la barre du haut : /api/recherche?q=vanille
const SOURCES: [type: string, sql: string, href: (id: number) => string][] = [
  ['Membre', `select id, nom as titre, coalesce(ville, '') as detail from members where nom ilike $1 or ville ilike $1 or description ilike $1`, id => `/membres/${id}`],
  ['Contact', `select c.member_id as id, c.nom as titre, m.nom || coalesce(' · ' || c.email, '') as detail from contacts c join members m on m.id = c.member_id where c.nom ilike $1 or c.email ilike $1`, id => `/membres/${id}`],
  ['Événement', `select id, titre, to_char(date_debut, 'DD/MM/YYYY') as detail from events where titre ilike $1 or lieu ilike $1`, id => `/evenements/${id}`],
  ['Facture', `select i.id, i.numero as titre, m.nom as detail from invoices i join members m on m.id = i.member_id where i.numero ilike $1 or m.nom ilike $1`, id => `/paiements/${id}`],
  ['Actualité', `select id, titre, coalesce(categorie, '') as detail from news where titre ilike $1 or contenu ilike $1`, id => `/actualites?id=${id}`],
  ['Abonné', `select id, email as titre, coalesce(nom, '') as detail from subscribers where email ilike $1 or nom ilike $1`, () => `/lettre`],
  ['Conversation', `select t.id, coalesce(nullif(t.sujet, ''), m.nom, 'Conversation') as titre, coalesce(m.nom, 'Groupe') as detail from threads t left join members m on m.id = t.member_id
                    where (t.type = 'membre' or exists (select 1 from thread_participants p where p.thread_id = t.id and p.member_id is not null))
                      and (t.sujet ilike $1 or m.nom ilike $1)`, id => `/messagerie?c=${id}`],
];

export async function GET(req: Request) {
  const u = await guard();
  if (u instanceof Response) return u;
  const term = (new URL(req.url).searchParams.get('q') ?? '').trim();
  if (term.length < 2) return Response.json([]);
  const like = '%' + term.replace(/[\\%_]/g, c => '\\' + c) + '%';
  try {
    const groups = await Promise.all(SOURCES.map(async ([type, sql, href]) =>
      (await q<{ id: number; titre: string; detail: string }>(sql + ' limit 8', [like])).map(r => ({ type, ...r, href: href(r.id) }))));
    return Response.json(groups.flat());
  } catch (e) {
    return fail(e);
  }
}
