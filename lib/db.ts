import pg from 'pg';

// Les colonnes date restent des chaînes « AAAA-MM-JJ » (pas de décalage de fuseau),
// les numeric deviennent des nombres.
pg.types.setTypeParser(1082, v => v);
pg.types.setTypeParser(1700, v => parseFloat(v));

const g = globalThis as unknown as { pool?: pg.Pool };
export const pool = (g.pool ??= new pg.Pool({ connectionString: process.env.DATABASE_URL }));

export async function q<T = Record<string, unknown>>(text: string, values?: unknown[]) {
  return (await pool.query(text, values)).rows as T[];
}

// Erreurs Postgres de données (contrainte, format) → 400, le reste → 500
export function fail(e: unknown) {
  const err = e as { code?: string; message?: string };
  const status = err.code && /^2[23]/.test(err.code) ? 400 : 500;
  return Response.json({ error: err.message || 'Erreur serveur' }, { status });
}
