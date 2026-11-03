// Messagerie façon LinkedIn : conversations avec un membre, groupes, messages directs entre collègues.
// Visibilité : tout ce qui implique un membre est partagé par l'équipe (boîte de support) ;
// les groupes internes et les messages directs ne sont vus que par leurs participants.
import { pool, q } from './db';
import type { User } from './auth';
import { journal } from './hooks';
import { cleanEmails, deliver } from './mail';
import type { Row } from './format';

export class MsgError extends Error {}
export const MAX_FILE = 25 * 1024 * 1024;

const VISIBLE = `(t.type = 'membre'
  or (t.type = 'groupe' and exists (select 1 from thread_participants p where p.thread_id = t.id and p.member_id is not null))
  or exists (select 1 from thread_participants p where p.thread_id = t.id and p.user_id = $1))`;

export type Person = { kind: 'user' | 'member'; id: number; nom: string };

// Titre et avatar affichés pour une conversation, vus par l'utilisateur u
function present(t: Row, u: User) {
  const others: Person[] = (t.participants ?? []).filter((p: Person) => !(p.kind === 'user' && p.id === u.id));
  if (t.type === 'membre') return { titre: t.membre ?? 'Membre', avatar: { kind: 'member', id: t.member_id } };
  if (t.type === 'equipe') {
    const o = others[0];
    return { titre: o?.nom ?? 'Conversation', avatar: o ? { kind: o.kind, id: o.id } : null };
  }
  return { titre: t.sujet || others.map(p => p.nom).join(', ') || 'Groupe', avatar: null };
}

export async function listThreads(u: User, opts: { filtre?: string; q?: string; member_id?: number }) {
  const like = opts.q?.trim() ? '%' + opts.q.trim().replace(/[\\%_]/g, c => '\\' + c) + '%' : '';
  const rows = await q<Row>(`
    select t.id, t.type, t.sujet, t.member_id, m.nom as membre, t.created_by,
           coalesce(st.important, false) as important, coalesce(st.archived, false) as archived,
           l.texte as dernier, l.created_at as dernier_at, l.de_nous as dernier_de_nous, l.author_user_id as dernier_auteur,
           l.deleted_at is not null as dernier_supprime,
           (select count(*) from message_files f where f.message_id = l.id)::int as dernier_fichiers,
           (l.id is not null and l.created_at > coalesce(st.last_read_at, '-infinity') and l.author_user_id is distinct from $1) as non_lu,
           (select coalesce(json_agg(json_build_object('kind', case when p.user_id is not null then 'user' else 'member' end,
                    'id', coalesce(p.user_id, p.member_id), 'nom', coalesce(pu.nom, pm.nom)) order by p.id), '[]')
              from thread_participants p left join team_users pu on pu.id = p.user_id left join members pm on pm.id = p.member_id
              where p.thread_id = t.id) as participants,
           coalesce(l.created_at, t.created_at) as maj
    from threads t
    left join members m on m.id = t.member_id
    left join thread_state st on st.thread_id = t.id and st.user_id = $1
    left join lateral (select * from messages where thread_id = t.id order by created_at desc limit 1) l on true
    where ${VISIBLE}
      and ($2::int is null or t.member_id = $2 or exists (select 1 from thread_participants p where p.thread_id = t.id and p.member_id = $2))
      and ($3 = '' or t.sujet ilike $3 or m.nom ilike $3
           or exists (select 1 from messages mm where mm.thread_id = t.id and mm.deleted_at is null and mm.texte ilike $3)
           or exists (select 1 from thread_participants p left join team_users pu on pu.id = p.user_id left join members pm on pm.id = p.member_id
                      where p.thread_id = t.id and coalesce(pu.nom, pm.nom) ilike $3))
    order by maj desc`, [u.id, opts.member_id ?? null, like]);
  const f = opts.filtre ?? 'tous';
  return rows
    .filter(t => (f === 'archivees' ? t.archived : !t.archived))
    .filter(t => f === 'non-lus' ? t.non_lu : f === 'importants' ? t.important : f === 'membres' ? t.type === 'membre'
      : f === 'groupes' ? t.type === 'groupe' : f === 'equipe' ? t.type === 'equipe' : true)
    .map(t => ({ ...t, ...present(t, u) }));
}

export async function unreadCount(u: User) {
  const [r] = await q<{ n: number }>(`
    select count(*)::int as n from threads t
    left join thread_state st on st.thread_id = t.id and st.user_id = $1
    where ${VISIBLE} and not coalesce(st.archived, false)
      and exists (select 1 from messages l where l.thread_id = t.id and l.created_at > coalesce(st.last_read_at, '-infinity') and l.author_user_id is distinct from $1)`, [u.id]);
  return r.n;
}

export async function access(u: User, id: number) {
  const [t] = await q<Row>(`select t.* from threads t where t.id = $2 and ${VISIBLE}`, [u.id, id]);
  if (!t) throw new MsgError('Conversation introuvable');
  return t;
}

const participantsOf = (id: number) => q<Row>(`
  select p.id as pid, case when p.user_id is not null then 'user' else 'member' end as kind, coalesce(p.user_id, p.member_id) as id,
         coalesce(u.nom, m.nom) as nom, u.fonction, u.role, u.email, m.secteur_id, m.ville, m.pays, m.statut
  from thread_participants p left join team_users u on u.id = p.user_id left join members m on m.id = p.member_id
  where p.thread_id = $1 order by p.id`, [id]);

export async function getThread(u: User, id: number) {
  const t = await access(u, id);
  const participants = await participantsOf(id);
  const messages = await q<Row>(`
    select ms.id, ms.de_nous, ms.texte, ms.created_at, ms.edited_at, ms.deleted_at, ms.author_user_id, ms.author_member_id, ms.forwarded, ms.reply_to,
           coalesce(au.nom, am.nom, case when ms.de_nous then 'L’équipe' else tm.nom end) as auteur,
           case when ms.author_user_id is not null then 'user' when ms.author_member_id is not null or not ms.de_nous then 'member' else null end as auteur_kind,
           coalesce(ms.author_user_id, ms.author_member_id, case when not ms.de_nous then t.member_id end) as auteur_id,
           (select coalesce(json_agg(json_build_object('id', f.id, 'nom', f.nom, 'type', f.type, 'taille', f.taille) order by f.id), '[]')
              from message_files f where f.message_id = ms.id) as fichiers,
           -- message cité (réponse)
           (select json_build_object('id', r.id, 'texte', left(r.texte, 140), 'supprime', r.deleted_at is not null,
                     'fichiers', (select count(*) from message_files rf where rf.message_id = r.id),
                     'auteur', coalesce(ru.nom, rm.nom, case when r.de_nous then 'L’équipe' else tm.nom end))
              from messages r left join team_users ru on ru.id = r.author_user_id left join members rm on rm.id = r.author_member_id
              where r.id = ms.reply_to) as reponse_a,
           -- réactions regroupées par émoji, avec les noms
           (select coalesce(json_agg(json_build_object('emoji', x.emoji, 'n', x.n, 'noms', x.noms, 'moi', x.moi) order by x.premier), '[]')
              from (select mr.emoji, count(*)::int as n, string_agg(ru2.nom, ', ' order by mr.created_at) as noms,
                           bool_or(mr.user_id = $2) as moi, min(mr.created_at) as premier
                    from message_reactions mr join team_users ru2 on ru2.id = mr.user_id where mr.message_id = ms.id group by mr.emoji) x) as reactions
    from messages ms join threads t on t.id = ms.thread_id
    left join team_users au on au.id = ms.author_user_id left join members am on am.id = ms.author_member_id
    left join members tm on tm.id = t.member_id
    where ms.thread_id = $1 order by ms.created_at`, [id, u.id]);
  const [m] = t.member_id ? await q<Row>(`
    select m.id, m.nom, m.ville, m.pays, m.statut, m.description, m.offres, m.besoins, s.nom as secteur,
           (select coalesce(json_agg(json_build_object('nom', c.nom, 'fonction', c.fonction, 'email', c.email, 'tel', c.tel) order by c.principal desc, c.id), '[]')
              from contacts c where c.member_id = m.id) as contacts
    from members m left join secteurs s on s.id = m.secteur_id where m.id = $1`, [t.member_id]) : [];
  const [st] = await q<Row>('select * from thread_state where thread_id = $1 and user_id = $2', [id, u.id]);
  // Lu par les autres collègues (accusés de lecture)
  const lectures = await q<Row>(`select s.user_id, u.nom, s.last_read_at from thread_state s join team_users u on u.id = s.user_id
                                 where s.thread_id = $1 and s.user_id <> $2 and s.last_read_at is not null`, [id, u.id]);
  await markRead(u, id);
  const head = present({ ...t, membre: m?.nom, participants: participants.map(p => ({ kind: p.kind, id: p.id, nom: p.nom })) }, u);
  return { ...t, ...head, important: !!st?.important, archived: !!st?.archived, participants, messages, membre: m ?? null, lectures };
}

export const markRead = (u: User, id: number) => q(`
  insert into thread_state (thread_id, user_id, last_read_at) values ($1, $2, now())
  on conflict (thread_id, user_id) do update set last_read_at = now()`, [id, u.id]);

export async function setState(u: User, id: number, body: { important?: boolean; archived?: boolean; non_lu?: boolean }) {
  await access(u, id);
  await q('insert into thread_state (thread_id, user_id) values ($1, $2) on conflict do nothing', [id, u.id]);
  if (body.important !== undefined) await q('update thread_state set important = $3 where thread_id = $1 and user_id = $2', [id, u.id, !!body.important]);
  if (body.archived !== undefined) await q('update thread_state set archived = $3 where thread_id = $1 and user_id = $2', [id, u.id, !!body.archived]);
  if (body.non_lu) await q('update thread_state set last_read_at = null where thread_id = $1 and user_id = $2', [id, u.id]);
}

type Upload = { nom: string; type: string; taille: number; contenu: Buffer };

// Envoi d'un message. entrant = réponse reçue d'un membre (par téléphone, courriel…) que l'équipe note dans la conversation.
export async function sendMessage(u: User, id: number, texte: string, files: Upload[], entrant?: number | null, replyTo?: number | null) {
  const t = await access(u, id);
  texte = texte.trim();
  if (!texte && !files.length) throw new MsgError('Message vide');
  if (files.some(f => f.taille > MAX_FILE)) throw new MsgError('Un fichier dépasse 25 Mo');
  const client = await pool.connect();
  let msg: Row;
  try {
    await client.query('begin');
    ({ rows: [msg] } = await client.query(
      `insert into messages (thread_id, de_nous, author_user_id, author_member_id, texte, reply_to)
       values ($1, $2, $3, $4, $5, (select id from messages where id = $6 and thread_id = $1)) returning *`,
      [id, !entrant, entrant ? null : u.id, entrant ?? null, texte, replyTo ?? null]));
    for (const f of files)
      await client.query('insert into message_files (message_id, nom, type, taille, contenu) values ($1, $2, $3, $4, $5)', [msg.id, f.nom, f.type, f.taille, f.contenu]);
    await client.query('commit');
  } catch (e) {
    await client.query('rollback');
    throw e;
  } finally {
    client.release();
  }
  await markRead(u, id);
  // Les membres n'ont pas de compte : ils reçoivent les messages de l'équipe par courriel
  if (!entrant) {
    const memberIds = [...new Set([t.member_id, ...(await q<{ member_id: number }>('select member_id from thread_participants where thread_id = $1 and member_id is not null', [id])).map(r => r.member_id)].filter(Boolean))];
    if (memberIds.length) {
      const to = cleanEmails((await q<{ email: string }>('select email from contacts where member_id = any($1) and email is not null', [memberIds])).map(r => r.email));
      const small = files.reduce((a, f) => a + f.taille, 0) <= 10 * 1024 * 1024;
      if (to.length) {
        const subject = t.type === 'groupe' && t.sujet ? t.sujet : `Message de ${u.nom}`;
        const text = `${texte}${files.length ? `\n\nPièces jointes : ${files.map(f => f.nom).join(', ')}${small ? '' : ' (trop volumineuses pour le courriel, demandez-les en réponse)'}` : ''}\n\n${u.nom}${u.fonction ? ', ' + u.fonction : ''}`;
        const r = await deliver(to, subject, text, small ? files.map(f => ({ filename: f.nom, content: f.contenu, contentType: f.type })) : []);
        await q(`insert into outbox (type, sujet, destinataires, nb, date_envoi, statut, contenu, erreur) values ('courriel', $1, $2, $3, now(), $4, $5, $6)`,
          [subject, to.join(', '), to.length, r.sent ? 'envoyé' : 'échec', text, r.error]);
      }
    }
  }
  return msg;
}

// Nouvelle conversation. 1 membre seul → conversation membre ; 1 collègue seul → message direct (réutilisé s'il existe) ; sinon groupe.
export async function createThread(u: User, b: { user_ids?: number[]; member_ids?: number[]; sujet?: string }) {
  const users = [...new Set((b.user_ids ?? []).map(Number).filter(x => x && x !== u.id))];
  const members = [...new Set((b.member_ids ?? []).map(Number).filter(Boolean))];
  if (!users.length && !members.length) throw new MsgError('Choisissez au moins un destinataire');
  if (members.length === 1 && !users.length) {
    const [t] = await q<Row>(`insert into threads (type, member_id, sujet, created_by) values ('membre', $1, $2, $3) returning *`, [members[0], b.sujet?.trim() || '', u.id]);
    return t;
  }
  if (users.length === 1 && !members.length) {
    const [exist] = await q<Row>(`select t.* from threads t where t.type = 'equipe'
      and (select array_agg(user_id order by user_id) from thread_participants where thread_id = t.id) = $1::int[]`, [[u.id, users[0]].sort((x, y) => x - y)]);
    if (exist) return exist;
    const [t] = await q<Row>(`insert into threads (type, created_by) values ('equipe', $1) returning *`, [u.id]);
    await q('insert into thread_participants (thread_id, user_id) values ($1, $2), ($1, $3)', [t.id, u.id, users[0]]);
    return t;
  }
  const [t] = await q<Row>(`insert into threads (type, sujet, created_by) values ('groupe', $1, $2) returning *`, [b.sujet?.trim() || '', u.id]);
  await addParticipants(u, t.id, [u.id, ...users], members, true);
  await journal('Communication', 'Groupe de discussion créé', b.sujet?.trim() || `${users.length + members.length + 1} participants`, u.nom);
  return t;
}

export async function addParticipants(u: User, id: number, users: number[], members: number[], creating = false) {
  const t = creating ? null : await access(u, id);
  if (t && t.type !== 'groupe') {
    // Ajouter quelqu'un à une conversation à deux crée un nouveau groupe (comme LinkedIn)
    const cur = await participantsOf(id);
    const curUsers = cur.filter(p => p.kind === 'user').map(p => p.id), curMembers = [...cur.filter(p => p.kind === 'member').map(p => p.id), ...(t.member_id ? [t.member_id] : [])];
    return createThread(u, { user_ids: [...curUsers, ...users], member_ids: [...curMembers, ...members] });
  }
  for (const x of users) await q('insert into thread_participants (thread_id, user_id) values ($1, $2) on conflict do nothing', [id, x]);
  for (const x of members) await q('insert into thread_participants (thread_id, member_id) values ($1, $2) on conflict do nothing', [id, x]);
  return t ?? { id };
}

export async function removeParticipant(u: User, id: number, kind: 'user' | 'member', ref: number) {
  const t = await access(u, id);
  if (t.type !== 'groupe') throw new MsgError('On ne peut retirer quelqu’un que d’un groupe');
  if (!(kind === 'user' && ref === u.id) && t.created_by !== u.id && u.role !== 'Administrateur')
    throw new MsgError('Seul le créateur du groupe ou un administrateur peut retirer quelqu’un');
  await q(`delete from thread_participants where thread_id = $1 and ${kind === 'user' ? 'user_id' : 'member_id'} = $2`, [id, ref]);
}

export async function renameThread(u: User, id: number, sujet: string) {
  const t = await access(u, id);
  if (t.type === 'equipe') throw new MsgError('Un message direct ne se renomme pas');
  await q('update threads set sujet = $2 where id = $1', [id, sujet.trim()]);
}

export async function deleteThread(u: User, id: number) {
  const t = await access(u, id);
  if (t.created_by !== u.id && u.role !== 'Administrateur') throw new MsgError('Seul le créateur ou un administrateur peut supprimer la conversation');
  await q('delete from threads where id = $1', [id]);
  await journal('Communication', 'Conversation supprimée', t.sujet || `#${id}`, u.nom);
}

export async function editMessage(u: User, mid: number, texte: string | null) {
  const [m] = await q<Row>('select * from messages where id = $1', [mid]);
  if (!m) throw new MsgError('Message introuvable');
  await access(u, m.thread_id);
  if (m.author_user_id !== u.id) throw new MsgError('Vous ne pouvez modifier que vos propres messages');
  if (texte === null) {
    await q(`update messages set deleted_at = now(), texte = '' where id = $1`, [mid]);
    await q('delete from message_files where message_id = $1', [mid]);
  } else {
    if (!texte.trim()) throw new MsgError('Message vide');
    await q('update messages set texte = $2, edited_at = now() where id = $1', [mid, texte.trim()]);
  }
}

export async function fileFor(u: User, fid: number) {
  const [f] = await q<Row>('select f.*, m.thread_id from message_files f join messages m on m.id = f.message_id where f.id = $1', [fid]);
  if (!f) throw new MsgError('Fichier introuvable');
  await access(u, f.thread_id);
  return f as Row & { contenu: Buffer };
}

// Destinataires possibles : collègues actifs et membres adhérents
// Comparaison sans accents ni majuscules, côté base et côté saisie
const FROM = 'àáâäãåçèéêëìíîïñòóôöõùúûüýÿœæ', TO = 'aaaaaaceeeeiiiinooooouuuuyyoa';
const FOLD = (col: string) => `translate(lower(${col}), '${FROM}', '${TO}')`;
const plain = (s: string) => [...s.toLowerCase()].map(c => (FROM.includes(c) ? TO[FROM.indexOf(c)] : c)).join('');

export async function people(u: User, term: string) {
  const like = '%' + plain(term.trim()).replace(/[\\%_]/g, c => '\\' + c) + '%';
  const users = await q<Row>(`select 'user' as kind, id, nom, coalesce(fonction, role) as detail from team_users
                              where actif and id <> $1 and ${FOLD('nom')} like $2 order by nom limit 15`, [u.id, like]);
  const members = await q<Row>(`select 'member' as kind, m.id, m.nom, concat_ws(' · ', s.nom, m.ville) as detail from members m left join secteurs s on s.id = m.secteur_id
                                where m.statut in ('a_jour', 'retard', 'attente') and (${FOLD('m.nom')} like $1
                                  or exists (select 1 from contacts c where c.member_id = m.id and ${FOLD('c.nom')} like $1)) order by m.nom limit 15`, [like]);
  return [...users, ...members];
}

// Réaction : un même émoji une deuxième fois retire la réaction ; un autre émoji la remplace
export async function react(u: User, mid: number, emoji: string) {
  const [m] = await q<Row>('select thread_id from messages where id = $1 and deleted_at is null', [mid]);
  if (!m) throw new MsgError('Message introuvable');
  await access(u, m.thread_id);
  if (!emoji || [...emoji].length > 8) throw new MsgError('Réaction invalide');
  const [cur] = await q<{ emoji: string }>('select emoji from message_reactions where message_id = $1 and user_id = $2', [mid, u.id]);
  if (cur?.emoji === emoji) await q('delete from message_reactions where message_id = $1 and user_id = $2', [mid, u.id]);
  else await q(`insert into message_reactions (message_id, user_id, emoji) values ($1, $2, $3)
                on conflict (message_id, user_id) do update set emoji = excluded.emoji, created_at = now()`, [mid, u.id, emoji]);
}

// Transférer un message (texte et pièces jointes) vers une autre conversation
export async function forward(u: User, mid: number, target: number) {
  const [m] = await q<Row>('select * from messages where id = $1 and deleted_at is null', [mid]);
  if (!m) throw new MsgError('Message introuvable');
  await access(u, m.thread_id);
  await access(u, target);
  const files = await q<Row>('select nom, type, taille, contenu from message_files where message_id = $1', [mid]);
  const msg = await sendMessage(u, target, m.texte || ' ', files.map(f => ({ nom: f.nom, type: f.type, taille: f.taille, contenu: f.contenu })));
  await q('update messages set forwarded = true where id = $1', [msg.id]);
  return msg;
}
