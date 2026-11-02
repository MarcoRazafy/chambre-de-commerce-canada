import { fail } from './db';
import { guard, type User } from './auth';
import { MsgError } from './messaging';

// Route protégée : vérifie la session, convertit les erreurs métier en 400
export async function withUser(fn: (u: User) => Promise<Response>) {
  const u = await guard();
  if (u instanceof Response) return u;
  try {
    return await fn(u);
  } catch (e) {
    return e instanceof MsgError ? Response.json({ error: e.message }, { status: 400 }) : fail(e);
  }
}

export const num = (v: string) => (/^\d{1,9}$/.test(v) ? Number(v) : NaN);

// Fichiers d'un formulaire multipart → { nom, type, taille, contenu }
export async function uploads(form: FormData, field = 'files') {
  return Promise.all(form.getAll(field).filter((f): f is File => f instanceof File && f.size > 0).map(async f => ({
    nom: f.name, type: f.type || 'application/octet-stream', taille: f.size, contenu: Buffer.from(await f.arrayBuffer()),
  })));
}
