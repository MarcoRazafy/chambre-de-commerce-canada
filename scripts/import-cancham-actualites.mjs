// Reprend les actualités de l'ancienne plateforme CanCham (texte complet, photos, date, catégorie, mots-clés).
// Usage : npm run db:import-cancham-actualites -- <fichier.sql> <dossier-images>
// Une actualité déjà présente ici (même titre, sans tenir compte des émojis ni de la ponctuation) est mise à jour :
// ses réactions et commentaires sont conservés. Les autres sont ajoutées.
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const [sqlFile, imgDir] = process.argv.slice(2).filter(a => !a.startsWith('--'));
if (!sqlFile || !imgDir) throw new Error('Usage : npm run db:import-cancham-actualites -- <fichier.sql> <dossier-images>');
const dump = fs.readFileSync(sqlFile, 'utf8');

const unesc = v => v === '\\N' ? null : v.replace(/\\(\\|t|n|r|b|f|v|[0-7]{1,3})/g, (_, c) =>
  ({ '\\': '\\', t: '\t', n: '\n', r: '\r', b: '\b', f: '\f', v: '\v' })[c] ?? String.fromCharCode(parseInt(c, 8)));
function table(name) {
  const m = dump.match(new RegExp(`^COPY public\\.${name} \\(([^)]*)\\) FROM stdin;\\n([\\s\\S]*?)^\\\\\\.$`, 'm'));
  if (!m) throw new Error(`Table « ${name} » absente de l'export`);
  const cols = m[1].split(', ').map(c => c.replace(/"/g, ''));
  return m[2].split('\n').filter(Boolean).map(l => Object.fromEntries(l.split('\t').map((v, i) => [cols[i], unesc(v)])));
}
const pgArray = v => (v ?? '{}').replace(/^\{|\}$/g, '').split(',').map(s => s.replace(/^"|"$/g, '')).filter(Boolean);
// Comparaison de titres : sans émojis, accents, ponctuation ni casse
const key = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', mp4: 'video/mp4' };
const CATEGORIES = ['Vie de la chambre', 'Programmation', 'Opportunités'];
const clean = t => (t ?? '').replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
const tagsOf = t => [...new Set([...(t ?? '').matchAll(/#([\p{L}\d_]{2,40})/gu)].map(m => m[1]))].slice(0, 8);

const news = table('news');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const q = (sql, vals) => client.query(sql, vals).then(r => r.rows);
const local = await q('select id, titre from news');
let added = 0, updated = 0, photos = 0;
const missing = [];

try {
  await q('begin');
  for (const n of news.sort((a, b) => a.date.localeCompare(b.date))) {
    const titre = n.titre.replace(/\s+/g, ' ').trim();
    const contenu = clean(n.corps) || clean(n.extrait);
    const values = [titre, CATEGORIES.includes(n.cat) ? n.cat : 'Vie de la chambre', n.date, true, contenu, tagsOf(contenu), n.createdAt];
    const same = local.find(l => key(l.titre) === key(titre));
    const [row] = same
      ? await q('update news set titre = $1, categorie = $2, date_pub = $3, publie = $4, contenu = $5, tags = $6, created_at = $7 where id = $8 returning id', [...values, same.id])
      : await q('insert into news (titre, categorie, date_pub, publie, contenu, tags, created_at) values ($1, $2, $3, $4, $5, $6, $7) returning id', values);
    same ? updated++ : added++;
    // Photos : remplacées par celles de l'ancienne plateforme, dans le même ordre
    await q('delete from news_media where news_id = $1', [row.id]);
    for (const [i, ref] of pgArray(n.images).entries()) {
      const name = path.basename(ref), file = path.join(imgDir, name);
      if (!/^[\w.-]+$/.test(name) || !fs.existsSync(file)) { missing.push(name); continue; }
      const buf = fs.readFileSync(file);
      await q('insert into news_media (news_id, nom, type, taille, contenu, position) values ($1, $2, $3, $4, $5, $6)',
        [row.id, name, TYPES[name.split('.').pop().toLowerCase()] ?? 'image/jpeg', buf.length, buf, i]);
      photos++;
    }
  }
  await q('commit');
  console.log(`✓ ${news.length} actualités CanCham : ${updated} mises à jour, ${added} ajoutées, ${photos} photos.`);
  if (missing.length) console.log(`  Photos introuvables (${missing.length}) : ${missing.join(', ')}`);
} catch (e) {
  await q('rollback');
  throw e;
} finally {
  await client.end();
}
