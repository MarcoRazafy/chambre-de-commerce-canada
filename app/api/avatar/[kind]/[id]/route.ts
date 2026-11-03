import { q } from '@/lib/db';
import { notFound } from '@/lib/crud';
import { journal } from '@/lib/hooks';
import { num, withUser } from '@/lib/api-helpers';
import { MsgError } from '@/lib/messaging';

// Photo de profil (kind = user) ou logo de membre (kind = member).
// Sans photo, renvoie un cercle de couleur avec les initiales : une balise <img> suffit partout, sans erreur 404.
type Ctx = { params: Promise<{ kind: string; id: string }> };
const KINDS = { user: 'team_users', member: 'members' } as const;
// Teintes terreuses de la charte (ardoise, lagon, forêt, vanille, latérite, bois de rose, marine, gris bleu) : blanc lisible sur chacune
const COLORS = ['#2C4A6B', '#0E6767', '#2D6440', '#9A6512', '#9E4026', '#8A3651', '#0B1B33', '#4F5D73'];
const MAX = 3 * 1024 * 1024;

async function target(params: Ctx['params']) {
  const { kind, id } = await params;
  const n = num(id);
  return Object.hasOwn(KINDS, kind) && !Number.isNaN(n) ? { kind: kind as keyof typeof KINDS, id: n } : null;
}

function initialsSvg(nom: string) {
  const ini = nom.split(/\s+/).filter(w => /^[\p{L}\d]/u.test(w)).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
  const bg = COLORS[[...nom].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
  const esc = ini.replace(/[<>&"']/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${bg}"/><text x="32" y="33" dy=".35em" text-anchor="middle" font-family="Montserrat,Arial,sans-serif" font-size="24" font-weight="600" fill="#fff">${esc}</text></svg>`;
}

export async function GET(_req: Request, { params }: Ctx) {
  const t = await target(params);
  if (!t) return notFound();
  return withUser(async () => {
    const [a] = await q<{ type: string; contenu: Buffer }>('select type, contenu from avatars where kind = $1 and ref_id = $2', [t.kind, t.id]);
    if (a) return new Response(new Uint8Array(a.contenu), { headers: { 'Content-Type': a.type, 'Cache-Control': 'private, max-age=300', 'X-Content-Type-Options': 'nosniff' } });
    const [r] = await q<{ nom: string }>(`select nom from ${KINDS[t.kind]} where id = $1`, [t.id]);
    return new Response(initialsSvg(r?.nom ?? '?'), { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'private, max-age=300' } });
  });
}

// Nouvelle photo (formulaire multipart, champ « file ») : sa propre photo, ou n'importe laquelle pour un administrateur ; tout logo de membre
export async function PUT(req: Request, { params }: Ctx) {
  const t = await target(params);
  if (!t) return notFound();
  return withUser(async u => {
    if (t.kind === 'user' && t.id !== u.id && u.role !== 'Administrateur') throw new MsgError('Vous ne pouvez changer que votre propre photo');
    const f = (await req.formData()).get('file');
    if (!(f instanceof File) || !/^image\/(png|jpe?g|webp|gif)$/.test(f.type)) throw new MsgError('Choisissez une image PNG, JPEG, WebP ou GIF');
    if (f.size > MAX) throw new MsgError('L’image dépasse 3 Mo');
    await q(`insert into avatars (kind, ref_id, type, contenu) values ($1, $2, $3, $4)
             on conflict (kind, ref_id) do update set type = excluded.type, contenu = excluded.contenu, updated_at = now()`,
      [t.kind, t.id, f.type, Buffer.from(await f.arrayBuffer())]);
    await journal(t.kind === 'user' ? 'Équipe' : 'Adhésions', t.kind === 'user' ? 'Photo de profil modifiée' : 'Logo de membre modifié', `#${t.id}`, u.nom);
    return Response.json({ ok: true, v: Date.now() });
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const t = await target(params);
  if (!t) return notFound();
  return withUser(async u => {
    if (t.kind === 'user' && t.id !== u.id && u.role !== 'Administrateur') throw new MsgError('Vous ne pouvez retirer que votre propre photo');
    await q('delete from avatars where kind = $1 and ref_id = $2', [t.kind, t.id]);
    return new Response(null, { status: 204 });
  });
}
