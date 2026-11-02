// Crée les tables (vides) dans la base indiquée par DATABASE_URL.
// Usage : npm run db:init
import { readFile } from 'node:fs/promises';
import pg from 'pg';

const sql = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  await client.query(sql);
  const { rows } = await client.query(`select count(*)::int as n from information_schema.tables where table_schema = 'public'`);
  console.log(`Schéma installé : ${rows[0].n} tables, aucune donnée ajoutée.`);
} catch (e) {
  console.error('Échec :', e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
