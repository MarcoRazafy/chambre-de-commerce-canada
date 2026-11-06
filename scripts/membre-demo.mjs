// Accès d'exemple à l'espace membre : le contact principal de « L'ALLIÉE VIRTUELLE INC » se connecte avec
// membre@gmail.com / 12345678. À lancer seulement sur une base de test : npm run membre:demo
// (ne pas utiliser ce mot de passe en production)
import pg from 'pg';
import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const hash = async pw => { const salt = randomBytes(16).toString('hex'); return `${salt}:${(await scryptAsync(pw, salt, 64)).toString('hex')}`; };
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
try {
  const m = (await db.query(`select id, nom from members where nom ilike 'L''ALLIÉE VIRTUELLE%' order by id limit 1`)).rows[0];
  if (!m) throw new Error('Fiche « L’ALLIÉE VIRTUELLE INC » introuvable');
  const c = (await db.query('select id, nom from contacts where member_id = $1 order by principal desc, id limit 1', [m.id])).rows[0];
  if (!c) throw new Error(`Aucun contact sur la fiche ${m.nom}`);
  await db.query('update contacts set email = $2, password_hash = $3 where id = $1', [c.id, 'membre@gmail.com', await hash('12345678')]);
  console.log(`${c.nom} (${m.nom}, fiche n° ${m.id}) : membre@gmail.com / 12345678 → /connexion`);
} finally { await db.end(); }
