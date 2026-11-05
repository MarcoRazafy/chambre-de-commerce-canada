// Reprend la bibliothèque de ressources de l'ancienne plateforme CanCham : dossiers (imbriqués, couverture, auteur,
// accès réservé aux entreprises choisies), ressources (pages composées avec leurs blocs, PDF, DOCX, vidéos, photos),
// accès aux ressources payantes. Usage : npm run db:import-cancham-ressources -- <fichier.sql> <dossier-images>
// Les entreprises sont retrouvées par leur nom. Relançable : la bibliothèque est entièrement remplacée.
// Les fichiers protégés (PDF, vidéos, photos insérées dans les pages) ne sont pas dans l'export : ils sont listés à la fin.
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const [sqlFile, imgDir] = process.argv.slice(2).filter(a => !a.startsWith('--'));
if (!sqlFile || !imgDir) throw new Error('Usage : npm run db:import-cancham-ressources -- <fichier.sql> <dossier-images>');
const dump = fs.readFileSync(sqlFile, 'utf8');
const unesc = v => v === '\\N' ? null : v.replace(/\\(\\|t|n|r|b|f|v|[0-7]{1,3})/g, (_, c) =>
  ({ '\\': '\\', t: '\t', n: '\n', r: '\r', b: '\b', f: '\f', v: '\v' })[c] ?? String.fromCharCode(parseInt(c, 8)));
function table(name, optional = false) {
  const m = dump.match(new RegExp(`^COPY public\\.${name} \\(([^)]*)\\) FROM stdin;\\n([\\s\\S]*?)^\\\\\\.$`, 'm'));
  if (!m) { if (optional) return []; throw new Error(`Table « ${name} » absente de l'export`); }
  const cols = m[1].split(', ').map(c => c.replace(/"/g, ''));
  return m[2].split('\n').filter(Boolean).map(l => Object.fromEntries(l.split('\t').map((v, i) => [cols[i], unesc(v)])));
}
const key = t => (t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', pdf: 'application/pdf', mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' };
const utc = v => (v ? `${v.replace(' ', 'T')}Z` : null);
const FMT = { PDF: 'pdf', DOCX: 'docx', 'Vidéo': 'video', Photo: 'image', Page: 'page' };
const CAT = { Guide: 'guide', 'Modèle': 'modele', Formation: 'formation', Rapport: 'rapport' };

const dossiers = table('dossiers_ressources'), accesD = table('acces_dossiers'), resources = table('resources');
const accesR = table('acces_ressources', true), members = table('members');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const q = (sql, vals) => client.query(sql, vals).then(r => r.rows);

const local = await q('select id, nom from members');
const byName = new Map(local.map(m => [key(m.nom), m.id]));
const memberId = Object.fromEntries(members.map(m => [m.id, byName.get(key(m.nom))]).filter(([, v]) => v));
const manquants = new Set(), absents = new Set();

// Un fichier du dossier d'images, enregistré une seule fois même s'il sert à plusieurs ressources
const medias = new Map();
async function media(ref) {
  const name = path.basename(ref ?? '');
  if (!name) return null;
  if (medias.has(name)) return medias.get(name);
  const f = path.join(imgDir, name);
  if (!/^[\w.-]+$/.test(name) || !fs.existsSync(f)) { manquants.add(name); return null; }
  const buf = fs.readFileSync(f);
  const [m] = await q('insert into res_medias (nom, type, taille, contenu) values ($1, $2, $3, $4) returning id', [name, TYPES[name.split('.').pop().toLowerCase()] ?? 'application/octet-stream', buf.length, buf]);
  medias.set(name, m.id);
  return m.id;
}

let nPhotosPage = 0, nBlocsPerdus = 0;
// Blocs d'une page : le nom des photos et vidéos devient le numéro du fichier ; la couverture d'une page étant sa
// première photo, elle remplace celle-ci quand le fichier d'origine manque
async function blocs(contenu, couverture) {
  let liste;
  try { liste = JSON.parse(contenu ?? '[]'); } catch { return []; }
  if (!Array.isArray(liste)) return [];
  const out = [];
  let premiere = true;
  for (const b of liste) {
    if (b?.type === 'photo') {
      let m = await media(b.fichier);
      if (!m && premiere && couverture) { m = couverture; manquants.delete(path.basename(b.fichier ?? '')); }
      premiere = false;
      if (!m) { nBlocsPerdus++; continue; }
      nPhotosPage++;
      out.push({ type: 'photo', media: m, ...(b.legende ? { legende: b.legende } : {}) });
    } else if (b?.type === 'video' && b.source === 'fichier') {
      const m = await media(b.fichier);
      if (m) out.push({ type: 'video', source: 'fichier', media: m }); else nBlocsPerdus++;
    } else out.push(b);
  }
  return out;
}

try {
  await q('begin');
  await q('truncate res_acces_ressources, res_acces_dossiers, res_ressources, res_dossiers, res_medias restart identity');

  // Dossiers, puis leur rangement les uns dans les autres
  const dossierId = {};
  for (const d of dossiers) {
    const [row] = await q(`insert into res_dossiers (nom, restreint, cover, auteur_nom, auteur_role, auteur_bio, auteur_photo, created_at, updated_at)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id`,
      [d.nom.trim().slice(0, 80), d.restreint === 't', await media(d.cover), d.auteurNom, d.auteurRole, d.auteurBio, await media(d.auteurPhoto), utc(d.createdAt), utc(d.updatedAt)]);
    dossierId[d.id] = row.id;
  }
  for (const d of dossiers.filter(x => x.parentId && dossierId[x.parentId])) await q('update res_dossiers set parent_id = $1 where id = $2', [dossierId[d.parentId], dossierId[d.id]]);

  let nAccesD = 0;
  for (const a of accesD) {
    const did = dossierId[a.dossierId], mid = memberId[a.memberId];
    if (!did) continue;
    if (!mid) { absents.add(members.find(m => m.id === a.memberId)?.nom ?? a.memberId); continue; }
    await q('insert into res_acces_dossiers (dossier_id, member_id, ouvert_par, created_at) values ($1, $2, $3, $4) on conflict do nothing', [did, mid, a.ouvertPar, utc(a.createdAt)]);
    nAccesD++;
  }

  // Ressources, dans l'ordre de leur dossier
  const ressourceId = {}, parFormat = {};
  for (const r of resources.sort((a, b) => Number(a.ordre) - Number(b.ordre))) {
    const fmt = FMT[r.fmt] ?? 'pdf';
    const cover = await media(r.cover);
    let fichier = null, contenu = null;
    if (fmt === 'page') contenu = JSON.stringify(await blocs(r.contenu, cover));
    else if (fmt === 'image' && cover) fichier = cover;               // la couverture d'une photo en est une copie réduite
    else if (r.fichier) manquants.add(`${r.titre} (${r.fichier})`);
    const [row] = await q(`insert into res_ressources (dossier_id, titre, cat, fmt, taille, description, type, prix, ordre, fichier, cover, contenu, date, created_at, updated_at)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) returning id`,
      [dossierId[r.dossierId] ?? null, r.titre.trim().slice(0, 200), CAT[r.cat] ?? 'guide', fmt, r.taille || '—', r.description?.trim().slice(0, 600) || null,
        r.type === 'payant' ? 'payant' : 'gratuit', Math.round(Number(r.prix) || 0), Number(r.ordre) || 0, fichier, cover, contenu, r.date, utc(r.createdAt), utc(r.updatedAt)]);
    ressourceId[r.id] = row.id;
    parFormat[fmt] = (parFormat[fmt] ?? 0) + 1;
  }
  let nAccesR = 0;
  for (const a of accesR) {
    const rid = ressourceId[a.resourceId], mid = memberId[a.memberId];
    if (!rid || !mid) continue;
    await q('insert into res_acces_ressources (ressource_id, member_id, ouvert_par, created_at) values ($1, $2, $3, $4) on conflict do nothing', [rid, mid, a.ouvertPar, utc(a.createdAt)]);
    nAccesR++;
  }
  await q('commit');

  console.log(`Bibliothèque reprise : ${dossiers.length} dossiers (${nAccesD} accès réservés), ${resources.length} ressources`
    + ` (${Object.entries(parFormat).map(([k, n]) => `${n} ${k}`).join(', ')}), ${medias.size} images, ${nPhotosPage} photo(s) dans les pages, ${nAccesR} accès payants.`);
  if (absents.size) console.log(`Entreprises introuvables dans l'annuaire (accès non repris) : ${[...absents].join(', ')}`);
  if (nBlocsPerdus) console.log(`${nBlocsPerdus} photo(s) ou vidéo(s) de pages sans fichier, retirée(s) des pages.`);
  const docs = [...manquants].filter(m => m.includes('('));
  if (docs.length) console.log(`Fichiers à récupérer sur l'ancien serveur (stockage protégé) — ${docs.length} :\n  ${docs.join('\n  ')}`);
  const images = [...manquants].filter(m => !m.includes('('));
  if (images.length) console.log(`Images absentes du dossier : ${images.join(', ')}`);
} catch (e) {
  await q('rollback');
  throw e;
} finally {
  await client.end();
}
