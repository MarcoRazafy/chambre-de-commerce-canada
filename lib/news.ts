import { pool, q } from './db';
import type { User } from './auth';
import { journal, notify } from './hooks';
import { MAX_FILE, MsgError } from './messaging';

type Row = Record<string, any>;
type Upload = { nom: string; type: string; taille: number; contenu: Buffer };

export const CATEGORIES = ['Vie de la chambre', 'Programmation', 'Opportunités'];
const MEDIA = /^(image\/(png|jpe?g|gif|webp|avif)|video\/(mp4|webm|quicktime|ogg))$/;
const MENTION = /@\[([^\]\n]{1,80})\]\((user|member):(\d{1,9})\)/g;

// Collègues mentionnés dans un texte (les membres n'ont pas de compte : pas de notification pour eux)
const mentionedUsers = (t: string | null) => new Set([...(t ?? '').matchAll(MENTION)].filter(m => m[2] === 'user').map(m => Number(m[3])));

async function notifyMentions(u: User, before: string | null, after: string, lien: string, ou: string) {
  const old = mentionedUsers(before);
  const ids = [...mentionedUsers(after)].filter(id => !old.has(id) && id !== u.id);
  if (!ids.length) return;
  const names = await q<{ nom: string }>('select nom from team_users where id = any($1) order by nom', [ids]);
  for (const n of names) await notify(`${u.nom} a mentionné ${n.nom} ${ou}`, lien, { user: u.id, icon: 'chat' });
}

const reactionsOf = (table: string, key: string) => `
  (select coalesce(json_agg(r order by r.n desc, r.emoji), '[]') from (
     select x.emoji, count(*)::int as n, string_agg(t.nom, ', ' order by t.nom) as noms, bool_or(x.user_id = $1) as moi
     from ${table} x join team_users t on t.id = x.user_id where x.${key} group by x.emoji) r)`;

// Liste de droite : vignette (premier média), compteurs
export function listNews() {
  return q<Row>(`select n.id, n.titre, n.categorie, n.date_pub, n.publie, n.tags,
                        (select json_build_object('id', m.id, 'type', m.type) from news_media m where m.news_id = n.id order by m.position, m.id limit 1) as media,
                        (select count(*) from news_reactions r where r.news_id = n.id)::int as nb_reactions,
                        (select count(*) from news_comments c where c.news_id = n.id)::int as nb_commentaires
                 from news n order by n.date_pub desc, n.id desc`);
}

// Publications complètes : auteur, médias, réactions, commentaires (à plat, triés ; parent_id pour les réponses).
// $1 = utilisateur courant (« moi » dans les réactions), les paramètres suivants servent au filtre
function posts(u: User, where: string, params: unknown[] = [], limit = 100) {
  return q<Row>(`
    select n.id, n.titre, n.categorie, n.date_pub, n.publie, n.contenu, n.tags, n.created_at, n.updated_at,
           case when a.id is null then null else json_build_object('id', a.id, 'nom', a.nom, 'fonction', a.fonction) end as auteur,
           (select coalesce(json_agg(json_build_object('id', m.id, 'nom', m.nom, 'type', m.type, 'taille', m.taille) order by m.position, m.id), '[]')
              from news_media m where m.news_id = n.id) as medias,
           ${reactionsOf('news_reactions', 'news_id = n.id')} as reactions,
           (select coalesce(json_agg(json_build_object('id', c.id, 'parent_id', c.parent_id, 'texte', c.texte, 'created_at', c.created_at,
                     'edited_at', c.edited_at, 'auteur', case when t.id is null then null else json_build_object('id', t.id, 'nom', t.nom) end,
                     'reactions', ${reactionsOf('news_comment_reactions', 'comment_id = c.id')}) order by c.created_at, c.id), '[]')
              from news_comments c left join team_users t on t.id = c.user_id where c.news_id = n.id) as commentaires
    from news n left join team_users a on a.id = n.auteur_id where ${where}
    order by n.date_pub desc, n.id desc limit ${limit}`, [u.id, ...params]);
}

// Fil : toutes les actualités, une sous l'autre (les 100 plus récentes)
export const feed = (u: User) => posts(u, 'true');

export async function getNews(u: User, id: number) {
  const [n] = await posts(u, 'n.id = $2', [id], 1);
  if (!n) throw new MsgError('Actualité introuvable');
  return n;
}

const clean = (t: unknown, max: number) => String(t ?? '').replace(/\r\n/g, '\n').trim().slice(0, max);
const tagsOf = (v: unknown) => [...new Set((Array.isArray(v) ? v : String(v ?? '').split(','))
  .map(t => String(t).trim().replace(/^#+/, '').replace(/\s+/g, '-')).filter(t => /^[\p{L}\d_-]{1,40}$/u.test(t)))].slice(0, 12);

// Liste JSON envoyée dans un formulaire ; vide si illisible
export const jsonList = (v: FormDataEntryValue | null): unknown[] => { try { const x = JSON.parse(String(v ?? '[]')); return Array.isArray(x) ? x : []; } catch { return []; } };

// Champs du formulaire multipart (création et modification)
export const newsFields = (form: FormData) => ({
  titre: form.get('titre'), categorie: form.get('categorie'), date_pub: form.get('date_pub'), publie: form.get('publie'),
  contenu: form.get('contenu'), tags: jsonList(form.get('tags')),
});

// Création (id = null) ou modification ; files = nouvelles photos et vidéos, remove = médias à retirer
export async function saveNews(u: User, id: number | null, b: Row, files: Upload[], remove: number[]) {
  const titre = clean(b.titre, 200);
  if (!titre) throw new MsgError('Le titre est obligatoire');
  const categorie = CATEGORIES.includes(b.categorie) ? b.categorie : null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(b.date_pub)) ? b.date_pub : new Date().toISOString().slice(0, 10);
  const contenu = clean(b.contenu, 20000);
  const bad = files.find(f => !MEDIA.test(f.type));
  if (bad) throw new MsgError(`« ${bad.nom} » n’est ni une photo ni une vidéo`);
  if (files.some(f => f.taille > MAX_FILE)) throw new MsgError('Une photo ou vidéo dépasse 25 Mo');

  const [before] = id ? await q<Row>('select contenu from news where id = $1', [id]) : [null];
  if (id && !before) throw new MsgError('Actualité introuvable');
  const client = await pool.connect();
  try {
    await client.query('begin');
    const values = [titre, categorie, date, b.publie === true || b.publie === 'true', contenu, tagsOf(b.tags)];
    const { rows: [n] } = id
      ? await client.query('update news set titre = $1, categorie = $2, date_pub = $3, publie = $4, contenu = $5, tags = $6, updated_at = now() where id = $7 returning id', [...values, id])
      : await client.query('insert into news (titre, categorie, date_pub, publie, contenu, tags, auteur_id) values ($1, $2, $3, $4, $5, $6, $7) returning id', [...values, u.id]);
    if (remove.length) await client.query('delete from news_media where news_id = $1 and id = any($2)', [n.id, remove]);
    const { rows: [{ pos }] } = await client.query('select coalesce(max(position), -1) + 1 as pos from news_media where news_id = $1', [n.id]);
    for (const [i, f] of files.entries())
      await client.query('insert into news_media (news_id, nom, type, taille, contenu, position) values ($1, $2, $3, $4, $5, $6)', [n.id, f.nom, f.type, f.taille, f.contenu, pos + i]);
    await client.query('commit');
    await journal('Contenus', id ? 'Actualité modifiée' : 'Actualité ajoutée', titre, u.nom);
    await notifyMentions(u, before?.contenu ?? null, contenu, `/actualites?id=${n.id}`, `dans l’actualité « ${titre} »`);
    return n.id as number;
  } catch (e) {
    await client.query('rollback');
    throw e;
  } finally {
    client.release();
  }
}

export async function deleteNews(u: User, id: number) {
  const [n] = await q<Row>('delete from news where id = $1 returning titre', [id]);
  if (!n) throw new MsgError('Actualité introuvable');
  await journal('Contenus', 'Actualité supprimée', n.titre, u.nom);
}

export async function setPublished(u: User, id: number, publie: boolean) {
  const [n] = await q<Row>('update news set publie = $1, updated_at = now() where id = $2 returning titre', [publie, id]);
  if (!n) throw new MsgError('Actualité introuvable');
  await journal('Contenus', publie ? 'Actualité publiée' : 'Actualité dépubliée', n.titre, u.nom);
}

// Réaction (sur la publication ou un commentaire) : le même émoji la retire, un autre la remplace
async function toggle(table: string, key: string, ref: number, u: User, emoji: string) {
  if (!emoji || [...emoji].length > 8) throw new MsgError('Réaction invalide');
  const [cur] = await q<{ emoji: string }>(`select emoji from ${table} where ${key} = $1 and user_id = $2`, [ref, u.id]);
  if (cur?.emoji === emoji) await q(`delete from ${table} where ${key} = $1 and user_id = $2`, [ref, u.id]);
  else await q(`insert into ${table} (${key}, user_id, emoji) values ($1, $2, $3)
                on conflict (${key}, user_id) do update set emoji = excluded.emoji, created_at = now()`, [ref, u.id, emoji]);
}

export async function reactNews(u: User, id: number, emoji: string) {
  if (!(await q('select 1 from news where id = $1', [id])).length) throw new MsgError('Actualité introuvable');
  await toggle('news_reactions', 'news_id', id, u, emoji);
}

async function comment(cid: number) {
  const [c] = await q<Row>('select c.*, n.titre from news_comments c join news n on n.id = c.news_id where c.id = $1', [cid]);
  if (!c) throw new MsgError('Commentaire introuvable');
  return c;
}

// Réponse à une réponse : rattachée au commentaire principal (deux niveaux, comme Facebook)
export async function addComment(u: User, id: number, texte: string, parentId: number | null) {
  const t = clean(texte, 5000);
  if (!t) throw new MsgError('Le commentaire est vide');
  const [n] = await q<Row>('select titre from news where id = $1', [id]);
  if (!n) throw new MsgError('Actualité introuvable');
  let parent: number | null = null;
  if (parentId) {
    const p = await comment(parentId);
    if (p.news_id !== id) throw new MsgError('Commentaire introuvable');
    parent = p.parent_id ?? p.id;
  }
  const [c] = await q<Row>('insert into news_comments (news_id, parent_id, user_id, texte) values ($1, $2, $3, $4) returning id', [id, parent, u.id, t]);
  await notifyMentions(u, null, t, `/actualites?id=${id}&c=${c.id}`, `dans un commentaire sur « ${n.titre} »`);
  return c;
}

export async function editComment(u: User, cid: number, texte: string) {
  const c = await comment(cid);
  if (c.user_id !== u.id) throw new MsgError('Vous ne pouvez modifier que vos propres commentaires');
  const t = clean(texte, 5000);
  if (!t) throw new MsgError('Le commentaire est vide');
  await q('update news_comments set texte = $1, edited_at = now() where id = $2', [t, cid]);
  await notifyMentions(u, c.texte, t, `/actualites?id=${c.news_id}&c=${cid}`, `dans un commentaire sur « ${c.titre} »`);
}

// L'auteur, ou un administrateur ; les réponses partent avec le commentaire
export async function deleteComment(u: User, cid: number) {
  const c = await comment(cid);
  if (c.user_id !== u.id && u.role !== 'Administrateur') throw new MsgError('Seul l’auteur ou un administrateur peut supprimer ce commentaire');
  await q('delete from news_comments where id = $1', [cid]);
}

export async function reactComment(u: User, cid: number, emoji: string) {
  await comment(cid);
  await toggle('news_comment_reactions', 'comment_id', cid, u, emoji);
}

export async function mediaFile(mid: number) {
  const [m] = await q<Row>('select nom, type, contenu from news_media where id = $1', [mid]);
  if (!m) throw new MsgError('Fichier introuvable');
  return m;
}
