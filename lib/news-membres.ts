import { pool, q } from './db';
import type { Membre } from './espace';
import { journal, notify } from './hooks';
import { MsgError } from './messaging';
import { feedMembre, toggle, type Lecteur } from './news';

// Actualités vues de l'espace membre : publier, modifier ou retirer ses publications, réagir, commenter.
// Les publications des membres paraissent tout de suite pour les membres connectés ; la Chambre les relit après coup
// (elle peut les modifier, les repasser en brouillon ou les supprimer depuis sa page Actualités).
type Row = Record<string, any>;
type Upload = { nom: string; type: string; taille: number; contenu: Buffer };
const PHOTO = /^image\/(png|jpe?g|gif|webp|avif)$/;
const MAX_PHOTOS = 10, MAX_PHOTO = 8 * 1024 * 1024, PAR_HEURE = 5;
const lecteur = (m: Membre): Lecteur => ({ kind: 'contact', id: m.contact_id });
const clean = (t: unknown, max: number) => String(t ?? '').replace(/\r\n/g, '\n').trim().slice(0, max);
// Titre tiré de la première ligne du texte ; #mots-clés repris comme étiquettes
const titreDe = (t: string, entreprise: string) => {
  const l = t.split('\n').map(x => x.trim()).find(Boolean) ?? '';
  return l ? (l.length > 90 ? l.slice(0, 90).replace(/\s+\S*$/, '') + '…' : l) : `Publication de ${entreprise}`;
};
const tagsDe = (t: string) => [...new Set([...t.matchAll(/(^|\s)#([\p{L}\d_-]{2,40})/gu)].map(x => x[2]))].slice(0, 12);

export const fil = (m: Membre) => feedMembre(m.contact_id);

function verifierPhotos(files: Upload[], deja = 0) {
  const bad = files.find(f => !PHOTO.test(f.type));
  if (bad) throw new MsgError(`« ${bad.nom} » n’est pas une photo`);
  if (files.some(f => f.taille > MAX_PHOTO)) throw new MsgError('Une photo dépasse 8 Mo');
  if (deja + files.length > MAX_PHOTOS) throw new MsgError(`${MAX_PHOTOS} photos au plus par publication`);
}

export async function publier(m: Membre, texte: unknown, files: Upload[]) {
  const t = clean(texte, 5000);
  if (!t && !files.length) throw new MsgError('Écrivez un texte ou ajoutez une photo');
  verifierPhotos(files);
  const [{ n }] = await q<{ n: number }>(`select count(*)::int as n from news where contact_id = $1 and created_at > now() - interval '1 hour'`, [m.contact_id]);
  if (n >= PAR_HEURE) throw new MsgError('Vous avez déjà publié plusieurs fois cette heure-ci : réessayez un peu plus tard.');
  const client = await pool.connect();
  try {
    await client.query('begin');
    const { rows: [p] } = await client.query(
      `insert into news (titre, categorie, date_pub, publie, contenu, tags, contact_id, member_id) values ($1, null, current_date, true, $2, $3, $4, $5) returning id`,
      [titreDe(t, m.entreprise), t, tagsDe(t), m.contact_id, m.member_id]);
    for (const [i, f] of files.entries())
      await client.query('insert into news_media (news_id, nom, type, taille, contenu, position) values ($1, $2, $3, $4, $5, $6)', [p.id, f.nom, f.type, f.taille, f.contenu, i]);
    await client.query('commit');
    await journal('Contenus', 'Publication d’un membre', `${m.entreprise} · ${titreDe(t, m.entreprise)}`, `${m.nom} (espace membre)`);
    await notify(`${m.entreprise} a publié dans les actualités`, `/actualites?id=${p.id}`, { member: m.member_id, icon: 'news' });
    return p.id as number;
  } catch (e) { await client.query('rollback'); throw e; } finally { client.release(); }
}

// Seulement ses propres publications
async function sienne(m: Membre, id: number) {
  const [n] = await q<Row>('select id, titre from news where id = $1 and contact_id = $2', [id, m.contact_id]);
  if (!n) throw new MsgError('Publication introuvable');
  return n;
}

export async function modifier(m: Membre, id: number, texte: unknown, files: Upload[], retirer: number[]) {
  await sienne(m, id);
  const t = clean(texte, 5000);
  const [{ n }] = await q<{ n: number }>('select count(*)::int as n from news_media where news_id = $1 and not (id = any($2))', [id, retirer]);
  if (!t && !n && !files.length) throw new MsgError('Écrivez un texte ou gardez une photo');
  verifierPhotos(files, n);
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query('update news set titre = $1, contenu = $2, tags = $3, updated_at = now() where id = $4', [titreDe(t, m.entreprise), t, tagsDe(t), id]);
    if (retirer.length) await client.query('delete from news_media where news_id = $1 and id = any($2)', [id, retirer]);
    const { rows: [{ pos }] } = await client.query('select coalesce(max(position), -1) + 1 as pos from news_media where news_id = $1', [id]);
    for (const [i, f] of files.entries())
      await client.query('insert into news_media (news_id, nom, type, taille, contenu, position) values ($1, $2, $3, $4, $5, $6)', [id, f.nom, f.type, f.taille, f.contenu, pos + i]);
    await client.query('commit');
    await journal('Contenus', 'Publication d’un membre modifiée', `${m.entreprise} · ${titreDe(t, m.entreprise)}`, `${m.nom} (espace membre)`);
  } catch (e) { await client.query('rollback'); throw e; } finally { client.release(); }
}

export async function supprimer(m: Membre, id: number) {
  const n = await sienne(m, id);
  await q('delete from news where id = $1', [id]);
  await journal('Contenus', 'Publication d’un membre supprimée', `${m.entreprise} · ${n.titre}`, `${m.nom} (espace membre)`);
}

// Réactions et commentaires : sur les actualités publiées seulement
async function publiee(id: number) {
  const [n] = await q<Row>('select id, titre, contact_id from news where id = $1 and publie', [id]);
  if (!n) throw new MsgError('Actualité introuvable');
  return n;
}
async function commentaire(cid: number) {
  const [c] = await q<Row>('select c.*, n.titre from news_comments c join news n on n.id = c.news_id where c.id = $1 and n.publie', [cid]);
  if (!c) throw new MsgError('Commentaire introuvable');
  return c;
}

export async function reagir(m: Membre, id: number, emoji: string) {
  await publiee(id);
  await toggle('news_reactions', 'news_id', id, lecteur(m), emoji);
}

export async function commenter(m: Membre, id: number, texte: unknown, parentId: number | null) {
  const t = clean(texte, 5000);
  if (!t) throw new MsgError('Le commentaire est vide');
  const n = await publiee(id);
  let parent: number | null = null;
  if (parentId) {
    const p = await commentaire(parentId);
    if (p.news_id !== id) throw new MsgError('Commentaire introuvable');
    parent = p.parent_id ?? p.id;
  }
  const [c] = await q<Row>('insert into news_comments (news_id, parent_id, contact_id, texte) values ($1, $2, $3, $4) returning id', [id, parent, m.contact_id, t]);
  // L'équipe suit les échanges sur ses actualités (pas sur les publications d'autres membres)
  if (!n.contact_id) await notify(`${m.nom} (${m.entreprise}) a commenté « ${n.titre} »`, `/actualites?id=${id}&c=${c.id}`, { member: m.member_id, icon: 'chat' });
  return c;
}

export async function modifierCommentaire(m: Membre, cid: number, texte: unknown) {
  const c = await commentaire(cid);
  if (c.contact_id !== m.contact_id) throw new MsgError('Vous ne pouvez modifier que vos propres commentaires');
  const t = clean(texte, 5000);
  if (!t) throw new MsgError('Le commentaire est vide');
  await q('update news_comments set texte = $1, edited_at = now() where id = $2', [t, cid]);
}

// Son propre commentaire, ou n'importe quel commentaire sous sa propre publication
export async function supprimerCommentaire(m: Membre, cid: number) {
  const c = await commentaire(cid);
  const [n] = await q<Row>('select contact_id from news where id = $1', [c.news_id]);
  if (c.contact_id !== m.contact_id && n?.contact_id !== m.contact_id) throw new MsgError('Vous ne pouvez supprimer que vos propres commentaires');
  await q('delete from news_comments where id = $1', [cid]);
}

export async function reagirCommentaire(m: Membre, cid: number, emoji: string) {
  await commentaire(cid);
  await toggle('news_comment_reactions', 'comment_id', cid, lecteur(m), emoji);
}

// Colonne de droite : les dernières offres des autres membres (catalogue « Produits & services »)
export const offres = (m: Membre) => q<Row>(`
  select p.id, p.label, p.type, p.prix, mb.id as member_id, mb.nom as entreprise,
         (select f.id from produit_photos f where f.produit_id = p.id order by f.position, f.id limit 1) as photo
  from produits p join members mb on mb.id = p.member_id
  where mb.statut in ('a_jour', 'attente', 'retard') and mb.id <> $1 order by p.id desc limit 4`, [m.member_id]);
