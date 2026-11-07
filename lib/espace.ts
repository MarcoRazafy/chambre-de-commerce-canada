import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { q } from './db';
import { MsgError } from './messaging';
import { enHttps, verifyPassword } from './auth';

// Espace membre : connexion d'un contact d'une entreprise membre. Cookie et sessions séparés de l'équipe :
// une session membre ne donne jamais accès au back-office.
export const COOKIE_MEMBRE = 'cc_membre';
const DAYS = 30;
const digest = (t: string) => createHash('sha256').update(t).digest('hex');
export type Membre = { contact_id: number; nom: string; email: string; fonction: string | null; member_id: number; entreprise: string; statut: string };
const ACTIFS = `('a_jour', 'attente', 'retard')`;

export async function connecter(email: string, password: string) {
  const [c] = await q<{ id: number; nom: string; password_hash: string | null; statut: string }>(
    `select c.id, c.nom, c.password_hash, m.statut from contacts c join members m on m.id = c.member_id
     where lower(c.email) = lower($1) and c.password_hash is not null`, [email.trim()]);
  // Même réponse et même durée de calcul que le compte existe ou non
  const ok = await verifyPassword(password, c?.password_hash ?? 'aa:' + '0'.repeat(128));
  if (!c || !ok || !['a_jour', 'attente', 'retard'].includes(c.statut)) throw new MsgError('Courriel ou mot de passe incorrect');
  const token = randomBytes(32).toString('hex');
  await q(`insert into membre_sessions (id, contact_id, expires_at) values ($1, $2, now() + interval '${DAYS} days')`, [digest(token), c.id]);
  // Première connexion du contact : on lui propose d'abord le questionnaire (une seule fois)
  const [{ premiere }] = await q<{ premiere: boolean }>(
    `update contacts c set derniere_connexion = now(), premiere_connexion = coalesce(c.premiere_connexion, now())
     from contacts avant where c.id = $1 and avant.id = c.id returning avant.premiere_connexion is null as premiere`, [c.id]);
  await q('delete from membre_sessions where expires_at < now()');
  (await cookies()).set(COOKIE_MEMBRE, token, { httpOnly: true, sameSite: 'lax', secure: await enHttps(), path: '/', maxAge: DAYS * 86400 });
  return { ...c, vers: premiere ? '/espace/demarrage' : '/espace' };
}

export async function deconnecter() {
  const jar = await cookies();
  const t = jar.get(COOKIE_MEMBRE)?.value;
  if (t) await q('delete from membre_sessions where id = $1', [digest(t)]);
  jar.delete(COOKIE_MEMBRE);
}

export async function membreConnecte(): Promise<Membre | null> {
  const t = (await cookies()).get(COOKIE_MEMBRE)?.value;
  if (!t) return null;
  const [m] = await q<Membre>(
    `select c.id as contact_id, c.nom, c.email, c.fonction, m.id as member_id, m.nom as entreprise, m.statut
     from membre_sessions s join contacts c on c.id = s.contact_id join members m on m.id = c.member_id
     where s.id = $1 and s.expires_at > now() and c.password_hash is not null and m.statut in ${ACTIFS}`, [digest(t)]);
  return m ?? null;
}

// Route de l'espace membre : vérifie la session, convertit les erreurs métier en 400
export async function avecMembre(fn: (m: Membre) => Promise<Response>) {
  const m = await membreConnecte();
  if (!m) return Response.json({ error: 'Connexion requise' }, { status: 401 });
  try {
    return await fn(m);
  } catch (e) {
    if (e instanceof MsgError) return Response.json({ error: e.message }, { status: 400 });
    const err = e as { message?: string };
    return Response.json({ error: err.message || 'Erreur serveur' }, { status: 500 });
  }
}
