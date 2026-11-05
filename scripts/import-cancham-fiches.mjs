// Complète les fiches des membres avec les données de l'ancienne plateforme CanCham :
// catalogue « Produits & services » (photos comprises), portraits des contacts, commentaires de l'équipe.
// Usage : npm run db:import-cancham-fiches -- <fichier.sql> <dossier-images>
// Les membres sont retrouvés par leur nom, les contacts par leur courriel. Relançable : les données reprises sont remplacées,
// les commentaires écrits depuis dans L'Alliée Virtuelle (rattachés à un compte d'équipe) sont gardés.
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const [sqlFile, imgDir] = process.argv.slice(2).filter(a => !a.startsWith('--'));
if (!sqlFile || !imgDir) throw new Error('Usage : npm run db:import-cancham-fiches -- <fichier.sql> <dossier-images>');
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
const key = t => (t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
const file = ref => {
  const name = path.basename(ref ?? ''), f = path.join(imgDir, name);
  return /^[\w.-]+$/.test(name) && fs.existsSync(f) ? { name, buf: fs.readFileSync(f), type: TYPES[name.split('.').pop().toLowerCase()] ?? 'image/jpeg' } : null;
};
const clean = t => (t ?? '').replace(/\r\n/g, '\n').replace(/^[\s•·*\-–—]+/u, '').trim();

const members = table('members'), produits = table('produits'), users = table('users'), notes = table('notes_membres');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const q = (sql, vals) => client.query(sql, vals).then(r => r.rows);

const local = await q('select id, nom from members');
const byName = new Map(local.map(m => [key(m.nom), m.id]));
const ids = Object.fromEntries(members.map(m => [m.id, byName.get(key(m.nom))]).filter(([, v]) => v));
let nProd = 0, nPhotos = 0, nPortraits = 0, nNotes = 0;
const missing = [];

try {
  await q('begin');
  // Produits & services : remplacés pour chaque membre retrouvé
  const touched = [...new Set(Object.values(ids))];
  await q('delete from produits where member_id = any($1)', [touched]);
  for (const p of produits.sort((a, b) => Number(a.ordre) - Number(b.ordre))) {
    const mid = ids[p.memberId];
    if (!mid) continue;
    const [row] = await q(`insert into produits (member_id, label, type, prix, description, ordre) values ($1, $2, $3, $4, $5, $6) returning id`,
      [mid, clean(p.label).slice(0, 160), p.type === 'produit' ? 'produit' : 'service', clean(p.prix) || null, clean(p.description) || null, Number(p.ordre) || 0]);
    nProd++;
    for (const [i, ref] of pgArray(p.photos).slice(0, 5).entries()) {
      const f = file(ref);
      if (!f) { missing.push(path.basename(ref)); continue; }
      await q('insert into produit_photos (produit_id, nom, type, taille, contenu, position) values ($1, $2, $3, $4, $5, $6)', [row.id, f.name, f.type, f.buf.length, f.buf, i]);
      nPhotos++;
    }
  }
  // Portraits des contacts, retrouvés par leur courriel
  for (const u of users.filter(u => u.memberId && u.photo)) {
    const [c] = await q('select id from contacts where lower(email) = lower($1)', [u.email]);
    const f = file(u.photo);
    if (!c || !f) continue;
    await q(`insert into avatars (kind, ref_id, type, contenu) values ('contact', $1, $2, $3)
             on conflict (kind, ref_id) do update set type = excluded.type, contenu = excluded.contenu, updated_at = now()`, [c.id, f.type, f.buf]);
    nPortraits++;
  }
  // Commentaires de l'équipe : ceux repris (sans compte d'équipe rattaché) sont remplacés
  await q('delete from member_notes where user_id is null and member_id = any($1)', [touched]);
  for (const n of notes) {
    const mid = ids[n.memberId];
    if (!mid || !clean(n.texte)) continue;
    await q('insert into member_notes (member_id, texte, auteur, created_at) values ($1, $2, $3, $4)', [mid, n.texte.trim(), n.auteur || 'Équipe CanCham', n.createdAt]);
    nNotes++;
  }
  await q('commit');
  console.log(`✓ ${nProd} produits et services (${nPhotos} photos), ${nPortraits} portraits de contacts, ${nNotes} commentaires de l'équipe.`);
  if (missing.length) console.log(`  Photos introuvables (${missing.length}) : ${missing.join(', ')}`);
} catch (e) {
  await q('rollback');
  throw e;
} finally {
  await client.end();
}
