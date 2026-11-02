import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import { q } from './db';

const scryptAsync = promisify(scrypt) as (pw: string, salt: string, len: number) => Promise<Buffer>;
export const COOKIE = 'cc_session';
const DAYS = 30;

export type User = { id: number; nom: string; email: string; role: 'Administrateur' | 'Manager'; fonction: string | null };

export async function hashPassword(pw: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${(await scryptAsync(pw, salt, 64)).toString('hex')}`;
}

export async function verifyPassword(pw: string, stored: string | null) {
  if (!stored) return false;
  const [salt, hash] = stored.split(':');
  const a = Buffer.from(hash, 'hex'), b = await scryptAsync(pw, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}

const digest = (token: string) => createHash('sha256').update(token).digest('hex');

// Crée la session et pose le cookie (à appeler depuis un Route Handler)
export async function openSession(userId: number) {
  const token = randomBytes(32).toString('hex');
  await q(`insert into sessions (id, user_id, expires_at) values ($1, $2, now() + interval '${DAYS} days')`, [digest(token), userId]);
  await q('update team_users set derniere_connexion = now() where id = $1', [userId]);
  await q('delete from sessions where expires_at < now()');
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: DAYS * 86400 });
}

export async function closeSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await q('delete from sessions where id = $1', [digest(token)]);
  jar.delete(COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [u] = await q<User>(
    `select u.id, u.nom, u.email, u.role, u.fonction from sessions s join team_users u on u.id = s.user_id
     where s.id = $1 and s.expires_at > now() and u.actif`, [digest(token)]);
  return u ?? null;
}

// Pour les Route Handlers : renvoie l'utilisateur, ou une réponse 401/403 à retourner telle quelle
export async function guard(admin = false): Promise<User | Response> {
  const u = await currentUser();
  if (!u) return Response.json({ error: 'Connexion requise' }, { status: 401 });
  if (admin && u.role !== 'Administrateur') return Response.json({ error: 'Réservé aux administrateurs' }, { status: 403 });
  return u;
}
