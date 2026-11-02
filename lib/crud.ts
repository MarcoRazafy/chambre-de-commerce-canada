import { RESOURCES, type Resource } from './resources';

export const notFound = () => Response.json({ error: 'Introuvable' }, { status: 404 });

export function resourceOf(name: string) {
  return Object.hasOwn(RESOURCES, name) ? RESOURCES[name] : null;
}

export const validId = (id: string) => /^\d{1,9}$/.test(id);

// Garde uniquement les colonnes déclarées dans la ressource.
// À la création, un champ vide est omis (la valeur par défaut de la base s'applique) ;
// à la modification, il devient NULL.
export function clean(r: Resource, body: Record<string, unknown>, insert: boolean) {
  const cols: string[] = [], vals: unknown[] = [];
  for (const f of r.fields) {
    if (f.readonly || !(f.name in body)) continue;
    let v = body[f.name];
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
