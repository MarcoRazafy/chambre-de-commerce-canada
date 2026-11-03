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

// Fichier stocké en base : affiché dans la page pour les images, vidéos, sons et PDF, téléchargé sinon (?dl=1 force le téléchargement).
// Gère les requêtes partielles (Range) pour pouvoir avancer dans une vidéo.
const INLINE = /^(image\/(png|jpe?g|gif|webp|avif)|video\/|audio\/|application\/pdf)/;

export function fileResponse(req: Request, f: { nom: string; type: string; contenu: Buffer }) {
  const buf = f.contenu, total = buf.length;
  const inline = INLINE.test(f.type) && !new URL(req.url).searchParams.has('dl');
  const headers: Record<string, string> = {
    'Content-Type': inline ? f.type : 'application/octet-stream',
    'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(f.nom)}`,
    'X-Content-Type-Options': 'nosniff',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, max-age=3600',
  };
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') ?? '');
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(0, total - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), total - 1) : total - 1;
    if (start >= total || start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${total}` } });
    return new Response(new Uint8Array(buf.subarray(start, end + 1)), { status: 206, headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${total}`, 'Content-Length': String(end - start + 1) } });
  }
  return new Response(new Uint8Array(buf), { headers: { ...headers, 'Content-Length': String(total) } });
}
