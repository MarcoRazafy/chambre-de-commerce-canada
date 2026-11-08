import { q } from '@/lib/db';
import { notFound } from '@/lib/crud';
import { journal } from '@/lib/hooks';
import { num, withUser } from '@/lib/api-helpers';
import { currentUser } from '@/lib/auth';
import { membreConnecte } from '@/lib/espace';
import { MsgError } from '@/lib/messaging';
import { imageUrl } from '@/lib/format';

// Photo de profil (kind = user), logo de membre (kind = member), couverture de membre (kind = cover) ou portrait d'un contact (kind = contact).
// Sans photo : l'adresse du logo saisie sur la fiche membre, sinon un cercle de couleur avec les initiales : une balise <img> suffit partout, sans erreur 404.
type Ctx = { params: Promise<{ kind: string; id: string }> };
const KINDS = { user: 'team_users', member: 'members', cover: 'members', contact: 'contacts' } as const;
// Teintes terreuses de la charte (ardoise, lagon, forêt, vanille, latérite, bois de rose, marine, gris bleu) : blanc lisible sur chacune
const COLORS = ['#2C4A6B', '#0E6767', '#2D6440', '#9A6512', '#9E4026', '#8A3651', '#0B1B33', '#4F5D73'];
const MAX = 3 * 1024 * 1024, MAX_COVER = 6 * 1024 * 1024;

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
  // Espace membre : les logos des membres et les photos de l'équipe sont lisibles aussi par un membre connecté
  // (portraits de contacts : ceux des entreprises de l'annuaire, comme sur leur fiche)
  if (!(await currentUser())) {
    const m = await membreConnecte();
    if (m && (t.kind !== 'contact' || await contactVisible(t.id))) return lire(t);
  }
  return withUser(async () => lire(t));
}

async function lire(t: { kind: keyof typeof KINDS; id: number }) {
  const [a] = await q<{ type: string; contenu: Buffer }>('select type, contenu from avatars where kind = $1 and ref_id = $2', [t.kind, t.id]);
  if (a) return new Response(new Uint8Array(a.contenu), { headers: { 'Content-Type': a.type, 'Cache-Control': 'private, max-age=300', 'X-Content-Type-Options': 'nosniff' } });
  const [r] = await q<{ nom: string; logo_url?: string }>(`select nom${t.kind === 'member' ? ', logo_url' : ''} from ${KINDS[t.kind]} where id = $1`, [t.id]);
  const logo = imageUrl(r?.logo_url);
  if (logo) return new Response(null, { status: 302, headers: { Location: logo, 'Cache-Control': 'private, max-age=300' } });
  return new Response(initialsSvg(r?.nom ?? '?'), { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'private, max-age=300' } });
}

const contactVisible = async (id: number) => (await q(`select 1 from contacts c join members m on m.id = c.member_id where c.id = $1 and m.statut in ('a_jour', 'attente', 'retard')`, [id])).length > 0;
const contactDe = async (memberId: number, id: number) => (await q('select 1 from contacts where id = $1 and member_id = $2', [id, memberId])).length > 0;

// Nouvelle photo (formulaire multipart, champ « file ») : sa propre photo, ou n'importe laquelle pour un administrateur ; tout logo de membre
// Espace membre : un contact connecté ne peut changer que le logo, la couverture et les portraits des contacts de sa propre entreprise
async function membreProprietaire(t: { kind: keyof typeof KINDS; id: number }) {
  if (await currentUser()) return null;
  const m = await membreConnecte();
  if (!m) return null;
  if (t.kind === 'member' || t.kind === 'cover') return t.id === m.member_id ? m : null;
  return t.kind === 'contact' && await contactDe(m.member_id, t.id) ? m : null;
}

export async function PUT(req: Request, { params }: Ctx) {
  const t = await target(params);
  if (!t) return notFound();
  const proprio = await membreProprietaire(t);
  if (proprio) return enregistrerImage(req, t, `${proprio.nom} (espace membre)`).catch(e => Response.json({ error: (e as Error).message }, { status: 400 }));
  return withUser(async u => {
    if (t.kind === 'user' && t.id !== u.id && u.role !== 'Administrateur') throw new MsgError('Vous ne pouvez changer que votre propre photo');
    return enregistrerImage(req, t, u.nom);
  });
}

async function enregistrerImage(req: Request, t: { kind: keyof typeof KINDS; id: number }, par: string) {
  const f = (await req.formData()).get('file');
  if (!(f instanceof File) || !/^image\/(png|jpe?g|webp|gif)$/.test(f.type)) throw new MsgError('Choisissez une image PNG, JPEG, WebP ou GIF');
  if (f.size > (t.kind === 'cover' ? MAX_COVER : MAX)) throw new MsgError(`L’image dépasse ${t.kind === 'cover' ? 6 : 3} Mo`);
  await q(`insert into avatars (kind, ref_id, type, contenu) values ($1, $2, $3, $4)
           on conflict (kind, ref_id) do update set type = excluded.type, contenu = excluded.contenu, updated_at = now()`,
    [t.kind, t.id, f.type, Buffer.from(await f.arrayBuffer())]);
  await journal(t.kind === 'user' ? 'Équipe' : 'Adhésions', { user: 'Photo de profil modifiée', member: 'Logo de membre modifié', cover: 'Couverture de membre modifiée', contact: 'Portrait de contact modifié' }[t.kind], `#${t.id}`, par);
  return Response.json({ ok: true, v: Date.now() });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const t = await target(params);
  if (!t) return notFound();
  if (await membreProprietaire(t)) { await q('delete from avatars where kind = $1 and ref_id = $2', [t.kind, t.id]); return new Response(null, { status: 204 }); }
  return withUser(async u => {
    if (t.kind === 'user' && t.id !== u.id && u.role !== 'Administrateur') throw new MsgError('Vous ne pouvez retirer que votre propre photo');
    await q('delete from avatars where kind = $1 and ref_id = $2', [t.kind, t.id]);
    return new Response(null, { status: 204 });
  });
}
