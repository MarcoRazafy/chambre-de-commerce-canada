// Bibliothèque de ressources, reprise de CanCham Connect : dossiers imbriqués (5 niveaux), couverture et auteur,
// accès réservé à des entreprises choisies ; ressources fichier (PDF, DOCX, vidéo, photo) ou page composée de blocs ;
// gratuit / payant avec accès ouvert entreprise par entreprise ; rangement, copier / couper / coller.
import { pool, q } from './db';
import type { User } from './auth';
import { journal } from './hooks';
import { MsgError } from './messaging';
import { etiquettePage, lireBlocs } from './blocs';
import { CATS, FMTS, PROFONDEUR_MAX } from './bibliotheque';

type Row = Record<string, any>;
type Upload = { nom: string; type: string; taille: number; contenu: Buffer };

export const MAX_FICHIER = 100 * 1024 * 1024;
const MAX_IMAGE = 15 * 1024 * 1024;

const IMAGE = /^image\/(png|jpe?g|gif|webp|avif)$/;
const DOC = /^application\/(msword|vnd\.openxmlformats-officedocument\.(wordprocessingml|spreadsheetml|presentationml)\..+|vnd\.ms-(excel|powerpoint)|vnd\.oasis\.opendocument\..+|rtf)$/;
// Format d'une ressource d'après le type du fichier déposé
export function formatDe(type: string): string | null {
  if (type === 'application/pdf') return 'pdf';
  if (DOC.test(type)) return 'docx';
  if (/^video\/(mp4|webm|quicktime)$/.test(type)) return 'video';
  if (IMAGE.test(type)) return 'image';
  return null;
}

const clean = (v: unknown, max: number) => String(v ?? '').replace(/\r\n/g, '\n').trim().slice(0, max);
const idOu = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : NaN);
const ids = (v: unknown) => (Array.isArray(v) ? [...new Set(v.map(Number).filter(n => Number.isInteger(n) && n > 0))] : []);
export const tailleLisible = (o: number) =>
  o < 1024 * 1024 ? `${Math.max(1, Math.round(o / 1024))} Ko` : `${(o / 1024 / 1024).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`;

/* ===== Fichiers (documents, vidéos, photos, couvertures, médias des pages) ===== */
export async function saveMedia(f: Upload) {
  const fmt = formatDe(f.type);
  if (!fmt) throw new MsgError(`« ${f.nom} » : déposez un PDF, un document Office, une vidéo MP4 / WebM / MOV ou une photo JPEG / PNG / WebP.`);
  if (f.taille > (fmt === 'image' ? MAX_IMAGE : MAX_FICHIER)) throw new MsgError(`« ${f.nom} » dépasse ${fmt === 'image' ? 15 : 100} Mo.`);
  const [m] = await q<Row>('insert into res_medias (nom, type, taille, contenu) values ($1, $2, $3, $4) returning id, nom, type, taille',
    [f.nom.slice(0, 200), f.type, f.taille, f.contenu]);
  return { ...m, taille: Number(m.taille), fmt, libelle: tailleLisible(f.taille) };
}

export async function getMedia(id: number) {
  const [m] = await q<{ nom: string; type: string; contenu: Buffer }>('select nom, type, contenu from res_medias where id = $1', [id]);
  return m ?? null;
}

// Efface les fichiers que plus rien ne désigne (envois abandonnés depuis 24 h, ressources supprimées, photos retirées d'une page)
const gc = () => q(`delete from res_medias m where m.created_at < now() - interval '24 hours'
  and not exists (select 1 from res_ressources r where r.fichier = m.id or r.cover = m.id or r.contenu @> jsonb_build_array(jsonb_build_object('media', m.id)))
  and not exists (select 1 from res_dossiers d where d.cover = m.id or d.auteur_photo = m.id)`);

async function verifierMedia(id: number | null, attendu: 'image' | null, libelle: string) {
  if (id === null) return null;
  if (Number.isNaN(id)) throw new MsgError(`${libelle} : fichier illisible`);
  const [m] = await q<{ type: string; taille: string }>('select type, taille from res_medias where id = $1', [id]);
  if (!m) throw new MsgError(`${libelle} : le fichier envoyé est introuvable, déposez-le à nouveau`);
  if (attendu === 'image' && !IMAGE.test(m.type)) throw new MsgError(`${libelle} : choisissez une image JPEG, PNG ou WebP`);
  return { id, type: m.type, taille: Number(m.taille) };
}

/* ===== Lecture de la bibliothèque ===== */
// Tout ce que l'écran affiche, en une fois : la bibliothèque compte quelques dizaines de dossiers et de ressources
export async function bibliotheque() {
  const [dossiers, ressources, membres] = await Promise.all([
    q<Row>(`select d.id, d.parent_id, d.nom, d.restreint, d.cover, d.auteur_nom, d.auteur_role, d.auteur_bio, d.auteur_photo, d.created_at, d.updated_at,
                   coalesce((select json_agg(json_build_object('member_id', a.member_id, 'nom', m.nom, 'ouvert_par', a.ouvert_par, 'date', a.created_at) order by m.nom)
                             from res_acces_dossiers a join members m on m.id = a.member_id where a.dossier_id = d.id), '[]') as acces
            from res_dossiers d order by d.nom`),
    q<Row>(`select r.id, r.dossier_id, r.titre, r.cat, r.fmt, r.taille, r.description, r.type, r.prix, r.ordre, r.fichier, r.date, r.created_at, r.updated_at,
                   coalesce(r.cover, case when r.fmt = 'image' then r.fichier end,
                            (select (x.e->>'media')::int from jsonb_array_elements(coalesce(r.contenu, '[]')) with ordinality x(e, n)
                             where x.e->>'type' = 'photo' order by x.n limit 1)) as vignette,
                   coalesce((select json_agg(json_build_object('member_id', a.member_id, 'nom', m.nom, 'ouvert_par', a.ouvert_par, 'date', a.created_at) order by m.nom)
                             from res_acces_ressources a join members m on m.id = a.member_id where a.ressource_id = r.id), '[]') as acces
            from res_ressources r order by r.ordre, r.id`),
    q<Row>(`select id, nom, statut from members where statut not in ('demande', 'refusee') order by nom`),
  ]);
  return { dossiers, ressources, membres };
}

export async function getRessource(id: number) {
  const [r] = await q<Row>(`select r.*, f.nom as fichier_nom, f.type as fichier_type, f.taille::int as fichier_taille,
           coalesce(r.cover, case when r.fmt = 'image' then r.fichier end,
                    (select (x.e->>'media')::int from jsonb_array_elements(coalesce(r.contenu, '[]')) with ordinality x(e, n)
                     where x.e->>'type' = 'photo' order by x.n limit 1)) as vignette,
           coalesce((select json_agg(json_build_object('member_id', a.member_id, 'nom', m.nom, 'ouvert_par', a.ouvert_par, 'date', a.created_at) order by m.nom)
                     from res_acces_ressources a join members m on m.id = a.member_id where a.ressource_id = r.id), '[]') as acces
    from res_ressources r left join res_medias f on f.id = r.fichier where r.id = $1`, [id]);
  if (!r) throw new MsgError('Ressource introuvable');
  return { ...r, fil: r.dossier_id ? await fil(r.dossier_id) : [] };
}

// Chemin d'un dossier depuis la racine : [{ id, nom }, …]
export function fil(id: number) {
  return q<{ id: number; nom: string; restreint: boolean }>(`with recursive up as (
      select id, parent_id, nom, restreint, 0 as n from res_dossiers where id = $1
      union all select d.id, d.parent_id, d.nom, d.restreint, up.n + 1 from res_dossiers d join up on d.id = up.parent_id where up.n < 20)
    select id, nom, restreint from up order by n desc`, [id]);
}

/* ===== Ressources ===== */
const dernierRang = async (dossierId: number | null) =>
  Number((await q<{ n: number }>('select coalesce(max(ordre), -1) + 1 as n from res_ressources where dossier_id is not distinct from $1', [dossierId]))[0].n);

async function dossierExiste(id: number | null) {
  if (id === null) return null;
  if (Number.isNaN(id)) throw new MsgError('Dossier illisible');
  const [d] = await q('select id from res_dossiers where id = $1', [id]);
  if (!d) throw new MsgError('Ce dossier n’existe plus');
  return id;
}

export async function saveRessource(u: User, id: number | null, b: Row) {
  const avant = id ? (await q<Row>('select * from res_ressources where id = $1', [id]))[0] : null;
  if (id && !avant) throw new MsgError('Ressource introuvable');
  const titre = clean(b.titre, 200).replace(/\s+/g, ' ');
  if (!titre) throw new MsgError('Le titre est obligatoire');
  const cat = Object.hasOwn(CATS, b.cat) ? b.cat : 'guide';
  const fmt = avant?.fmt ?? (Object.hasOwn(FMTS, b.fmt) ? b.fmt : null);
  if (!fmt) throw new MsgError('Format inconnu');
  const type = b.type === 'payant' ? 'payant' : 'gratuit';
  const prix = type === 'payant' ? Math.round(Number(b.prix)) : 0;
  if (type === 'payant' && !(prix >= 1 && prix <= 100_000_000)) throw new MsgError('Indiquez le prix en ariary (1 Ar au moins)');
  const description = clean(b.description, 600) || null;
  const dossierId = await dossierExiste(idOu(b.dossier_id));
  const cover = await verifierMedia(idOu(b.cover), 'image', 'Couverture');

  let fichier: number | null = null, contenu: string | null = null, taille: string;
  if (fmt === 'page') {
    const lecture = lireBlocs(b.contenu);
    if (lecture.erreur !== undefined) throw new MsgError(lecture.erreur);
    const absents = await q<{ id: number }>(`select x.id from unnest($1::int[]) x(id) where not exists (select 1 from res_medias m where m.id = x.id)`,
      [lecture.blocs.flatMap(x => ('media' in x ? [x.media] : []))]);
    if (absents.length) throw new MsgError('Une photo ou une vidéo de la page est introuvable : déposez-la à nouveau.');
    contenu = JSON.stringify(lecture.blocs);
    taille = etiquettePage(lecture.blocs);
  } else {
    const f = await verifierMedia(idOu(b.fichier), null, 'Fichier');
    if (!f && !avant?.fichier && !avant) throw new MsgError('Déposez le fichier de la ressource');
    if (f && formatDe(f.type) !== fmt) throw new MsgError(`Ce fichier n’est pas au format ${FMTS[fmt]}`);
    fichier = f?.id ?? (b.fichier === null ? null : avant?.fichier ?? null);
    taille = f ? tailleLisible(f.taille) : avant?.taille ?? '—';
  }

  const values = [titre, cat, fmt, taille, description, type, prix, dossierId, fichier, cover?.id ?? null, contenu];
  let saved: Row;
  if (avant) {
    // Changer de dossier la range au bout du nouveau
    const ordre = avant.dossier_id === dossierId ? avant.ordre : await dernierRang(dossierId);
    [saved] = await q<Row>(`update res_ressources set titre = $1, cat = $2, fmt = $3, taille = $4, description = $5, type = $6, prix = $7, dossier_id = $8,
        fichier = $9, cover = $10, contenu = $11, ordre = $12, updated_at = now() where id = $13 returning id, titre`, [...values, ordre, id]);
    if (type === 'gratuit') await q('delete from res_acces_ressources where ressource_id = $1', [id]);
  } else {
    [saved] = await q<Row>(`insert into res_ressources (titre, cat, fmt, taille, description, type, prix, dossier_id, fichier, cover, contenu, ordre)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) returning id, titre`, [...values, await dernierRang(dossierId)]);
  }
  await journal('Contenus', avant ? 'Ressource modifiée' : 'Ressource ajoutée', titre, u.nom);
  await gc();
  return saved;
}

export async function deleteRessource(u: User, id: number) {
  const [r] = await q<{ titre: string }>('delete from res_ressources where id = $1 returning titre', [id]);
  if (!r) throw new MsgError('Ressource introuvable');
  await journal('Contenus', 'Ressource supprimée', r.titre, u.nom);
  await gc();
}

// Glisser-déposer : l'ordre complet des ressources d'un dossier
export async function ordonner(dossierId: number | null, liste: number[]) {
  await q(`update res_ressources r set ordre = x.n - 1 from unnest($1::int[]) with ordinality x(id, n)
           where r.id = x.id and r.dossier_id is not distinct from $2`, [liste, dossierId]);
}

export async function extreme(id: number, ou: 'premier' | 'dernier') {
  const [r] = await q<{ dossier_id: number | null }>('select dossier_id from res_ressources where id = $1', [id]);
  if (!r) throw new MsgError('Ressource introuvable');
  await q(`update res_ressources set ordre = (select ${ou === 'premier' ? 'coalesce(min(ordre), 0) - 1' : 'coalesce(max(ordre), 0) + 1'}
           from res_ressources where dossier_id is not distinct from $1) where id = $2`, [r.dossier_id, id]);
}

// Coller ce qui a été copié ou coupé : la copie reprend tout (fichiers partagés, sans les accès) avec « (copie) » au titre
export async function coller(u: User, liste: number[], mode: 'copier' | 'couper', cible: number | null) {
  if (!liste.length) throw new MsgError('Rien à coller');
  await dossierExiste(cible);
  const c = await pool.connect();
  try {
    await c.query('begin');
    let rang = Number((await c.query('select coalesce(max(ordre), -1) + 1 as n from res_ressources where dossier_id is not distinct from $1', [cible])).rows[0].n);
    const { rows } = await c.query('select * from res_ressources where id = any($1) order by ordre, id', [liste]);
    for (const r of rows) {
      if (mode === 'couper') {
        if (r.dossier_id !== cible) await c.query('update res_ressources set dossier_id = $1, ordre = $2, updated_at = now() where id = $3', [cible, rang++, r.id]);
      } else {
        await c.query(`insert into res_ressources (dossier_id, titre, cat, fmt, taille, description, type, prix, ordre, fichier, cover, contenu, date)
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [cible, `${r.titre} (copie)`.slice(0, 200), r.cat, r.fmt, r.taille, r.description, r.type, r.prix, rang++, r.fichier, r.cover, r.contenu ? JSON.stringify(r.contenu) : null, r.date]);
      }
    }
    await c.query('commit');
    await journal('Contenus', mode === 'couper' ? 'Ressources déplacées' : 'Ressources copiées', `${rows.length} ressource${rows.length > 1 ? 's' : ''}`, u.nom);
    return rows.length;
  } catch (e) { await c.query('rollback'); throw e; } finally { c.release(); }
}

// Ouvrir ou retirer l'accès d'entreprises à des ressources payantes (les gratuites sont écartées : tout membre les lit)
export async function accesRessources(u: User, liste: number[], membres: number[], ouvrir: boolean) {
  if (!liste.length || !membres.length) throw new MsgError('Choisissez au moins une ressource et une entreprise');
  if (ouvrir) {
    const r = await q(`insert into res_acces_ressources (ressource_id, member_id, ouvert_par)
        select r.id, m.id, $3 from res_ressources r cross join members m where r.id = any($1) and r.type = 'payant' and m.id = any($2)
        on conflict do nothing returning ressource_id`, [liste, membres, u.nom]);
    await journal('Contenus', 'Accès ouvert à des ressources payantes', `${membres.length} entreprise${membres.length > 1 ? 's' : ''}`, u.nom);
    return r.length;
  }
  const r = await q('delete from res_acces_ressources where ressource_id = any($1) and member_id = any($2) returning ressource_id', [liste, membres]);
  return r.length;
}

/* ===== Dossiers ===== */
// Niveau d'un dossier (1 à la racine) et nombre de niveaux qu'il contient sous lui
const niveau = async (id: number) => (await fil(id)).length;
const hauteur = async (id: number) => Number((await q<{ h: number }>(`with recursive down as (
    select id, 0 as h from res_dossiers where id = $1
    union all select d.id, down.h + 1 from res_dossiers d join down on d.parent_id = down.id where down.h < 20)
  select max(h) as h from down`, [id]))[0]?.h ?? 0);

function presentation(b: Row) {
  return {
    auteur_nom: clean(b.auteur_nom, 120) || null, auteur_role: clean(b.auteur_role, 160) || null, auteur_bio: clean(b.auteur_bio, 800) || null,
  };
}

type Requete = { query: (text: string, values?: unknown[]) => Promise<unknown> };
async function reglerAcces(c: Requete, u: User, dossierId: number, membres: number[]) {
  await c.query('delete from res_acces_dossiers where dossier_id = $1 and not (member_id = any($2))', [dossierId, membres]);
  await c.query(`insert into res_acces_dossiers (dossier_id, member_id, ouvert_par) select $1, m.id, $3 from members m where m.id = any($2)
                 on conflict do nothing`, [dossierId, membres, u.nom]);
}

export async function creerDossier(u: User, b: Row) {
  const nom = clean(b.nom, 80).replace(/\s+/g, ' ');
  if (!nom) throw new MsgError('Le nom du dossier est obligatoire');
  const parent = await dossierExiste(idOu(b.parent_id));
  if (parent && (await niveau(parent)) >= PROFONDEUR_MAX) throw new MsgError(`La bibliothèque compte ${PROFONDEUR_MAX} niveaux de dossiers au plus.`);
  const restreint = !!b.restreint, membres = ids(b.acces);
  if (restreint && !membres.length) throw new MsgError('Choisissez au moins une entreprise, ou ouvrez le dossier à tous les membres.');
  const cover = await verifierMedia(idOu(b.cover), 'image', 'Couverture');
  const photo = await verifierMedia(idOu(b.auteur_photo), 'image', 'Portrait');
  const p = presentation(b);
  const [d] = await q<Row>(`insert into res_dossiers (parent_id, nom, restreint, cover, auteur_nom, auteur_role, auteur_bio, auteur_photo)
      values ($1, $2, $3, $4, $5, $6, $7, $8) returning id, nom`, [parent, nom, restreint, cover?.id ?? null, p.auteur_nom, p.auteur_role, p.auteur_bio, photo?.id ?? null]);
  if (restreint) await reglerAcces(pool, u, d.id, membres);
  await journal('Contenus', 'Dossier créé', nom, u.nom);
  return d;
}

// Réglages d'un dossier : seuls les champs envoyés changent (nom, rangement, accès, couverture, auteur)
export async function modifierDossier(u: User, id: number, b: Row) {
  const [d] = await q<Row>('select * from res_dossiers where id = $1', [id]);
  if (!d) throw new MsgError('Dossier introuvable');
  const sets: string[] = [], vals: unknown[] = [];
  const set = (col: string, v: unknown) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };

  if ('nom' in b) {
    const nom = clean(b.nom, 80).replace(/\s+/g, ' ');
    if (!nom) throw new MsgError('Le nom du dossier est obligatoire');
    set('nom', nom);
  }
  if ('parent_id' in b) {
    const parent = await dossierExiste(idOu(b.parent_id));
    if (parent !== d.parent_id) {
      if (parent && (await fil(parent)).some(x => x.id === id)) throw new MsgError('Un dossier ne peut pas être rangé dans lui-même ni dans l’un de ses sous-dossiers.');
      if ((parent ? await niveau(parent) : 0) + 1 + (await hauteur(id)) > PROFONDEUR_MAX)
        throw new MsgError(`Ce rangement dépasserait ${PROFONDEUR_MAX} niveaux de dossiers.`);
      set('parent_id', parent);
    }
  }
  for (const k of ['cover', 'auteur_photo'] as const)
    if (k in b) set(k, (await verifierMedia(idOu(b[k]), 'image', k === 'cover' ? 'Couverture' : 'Portrait'))?.id ?? null);
  if ('auteur_nom' in b) { const p = presentation(b); set('auteur_nom', p.auteur_nom); set('auteur_role', p.auteur_role); set('auteur_bio', p.auteur_bio); }

  const c = await pool.connect();
  try {
    await c.query('begin');
    if ('restreint' in b) {
      const restreint = !!b.restreint, membres = ids(b.acces);
      if (restreint && !membres.length) throw new MsgError('Choisissez au moins une entreprise, ou ouvrez le dossier à tous les membres.');
      set('restreint', restreint);
      if (restreint) await reglerAcces(c, u, id, membres); else await c.query('delete from res_acces_dossiers where dossier_id = $1', [id]);
    }
    if (sets.length) await c.query(`update res_dossiers set ${sets.join(', ')}, updated_at = now() where id = $${vals.length + 1}`, [...vals, id]);
    await c.query('commit');
  } catch (e) { await c.query('rollback'); throw e; } finally { c.release(); }
  await journal('Contenus', 'parent_id' in b && Object.keys(b).length === 1 ? 'Dossier déplacé' : 'Dossier modifié', d.nom, u.nom);
  await gc();
}

// Supprimer un dossier : ce qu'il contient remonte d'un niveau, aucune ressource n'est effacée
export async function supprimerDossier(u: User, id: number) {
  const [d] = await q<Row>('select * from res_dossiers where id = $1', [id]);
  if (!d) throw new MsgError('Dossier introuvable');
  const c = await pool.connect();
  try {
    await c.query('begin');
    await c.query('update res_dossiers set parent_id = $1 where parent_id = $2', [d.parent_id, id]);
    const rang = Number((await c.query('select coalesce(max(ordre), -1) + 1 as n from res_ressources where dossier_id is not distinct from $1', [d.parent_id])).rows[0].n);
    await c.query('update res_ressources set dossier_id = $1, ordre = ordre + $2 where dossier_id = $3', [d.parent_id, rang, id]);
    await c.query('delete from res_dossiers where id = $1', [id]);
    await c.query('commit');
  } catch (e) { await c.query('rollback'); throw e; } finally { c.release(); }
  await journal('Contenus', 'Dossier supprimé', `${d.nom} (son contenu remonte d’un niveau)`, u.nom);
  await gc();
}

export const listeIds = ids;
