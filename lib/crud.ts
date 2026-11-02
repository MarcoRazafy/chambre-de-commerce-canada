import { RESOURCES, type Resource } from './resources';
import { hashPassword } from './auth';

export const notFound = () => Response.json({ error: 'Introuvable' }, { status: 404 });
export const bad = (error: string) => Response.json({ error }, { status: 400 });

export function resourceOf(name: string) {
  return Object.hasOwn(RESOURCES, name) ? RESOURCES[name] : null;
}

export const validId = (id: string) => /^\d{1,9}$/.test(id);

// Lecture : requête propre à la ressource (colonnes calculées) ou « select * »
export const baseSelect = (r: Resource) => `select * from (${r.select ?? `select * from ${r.table}`}) t`;

// Ne jamais renvoyer l'empreinte du mot de passe
export const strip = <T extends Record<string, unknown>>(row: T) => {
  if (row && 'password_hash' in row) {
    const { password_hash, ...rest } = row;
    return { ...rest, a_mot_de_passe: !!password_hash };
  }
  return row;
};

// Garde uniquement les colonnes déclarées dans la ressource.
// À la création, un champ vide est omis (la valeur par défaut de la base s'applique) ;
// à la modification, il devient NULL. Un mot de passe vide n'est jamais modifié.
export async function clean(r: Resource, body: Record<string, unknown>, insert: boolean) {
  const cols: string[] = [], vals: unknown[] = [];
  for (const f of r.fields) {
    if (f.readonly || !(f.name in body)) continue;
    let v = body[f.name];
    if (f.type === 'password') {
      if (!v) continue;
      if (String(v).length < 8) throw new RangeError('Le mot de passe doit faire au moins 8 caractères');
      cols.push('password_hash');
      vals.push(await hashPassword(String(v)));
      continue;
    }
    if (v === '' || v === undefined) {
      if (insert) continue;
      v = null;
    }
    if (f.type === 'lignes') v = JSON.stringify(v ?? []);
    cols.push(f.name);
    vals.push(v);
  }
  return { cols, vals };
}

// Filtres d'URL : /api/contacts?member_id=5 (uniquement sur des champs déclarés)
export function filters(r: Resource, url: string) {
  const where: string[] = [], vals: unknown[] = [];
  new URL(url).searchParams.forEach((v, k) => {
    if (r.fields.some(f => f.name === k)) {
      vals.push(v);
      where.push(`${k}::text = $${vals.length}`);
    }
  });
  return { where: where.length ? ' where ' + where.join(' and ') : '', vals };
}
