import type { Person } from './chat';

export type Reaction = { emoji: string; n: number; noms: string; moi: boolean };
export type Media = { id: number; nom: string; type: string; taille: number };
// Auteur : un collègue (kind « user ») ou un contact d'une entreprise membre (kind « contact », avec son entreprise)
export type Auteur = { kind?: 'user' | 'contact'; id: number | null; nom: string; fonction?: string | null; member_id?: number | null; entreprise?: string | null };
// Lecteur connecté : un collègue (rôle) ou un contact de l'espace membre (son entreprise)
export type Me = { kind?: 'user' | 'contact'; id: number; role?: string; member_id?: number };
export const estMoi = (a: Auteur | null | undefined, me: Me) => !!a && a.id != null && (a.kind ?? 'user') === (me.kind ?? 'user') && a.id === me.id;
export type Comment = { id: number; parent_id: number | null; texte: string; created_at: string; edited_at: string | null; auteur: Auteur | null; reactions: Reaction[] };
export type News = {
  id: number; titre: string; categorie: string | null; date_pub: string; publie: boolean; contenu: string | null; tags: string[];
  created_at: string; updated_at: string | null; auteur: Auteur | null; member_id?: number | null;
  medias: Media[]; reactions: Reaction[]; commentaires: Comment[];
};
export type NewsItem = Pick<News, 'id' | 'titre' | 'categorie' | 'date_pub' | 'publie' | 'tags'> & { media: { id: number; type: string } | null; nb_reactions: number; nb_commentaires: number };

async function json<T>(r: Response): Promise<T> {
  if (r.status === 401) window.location.href = '/connexion';
  if (r.status === 204) return null as T;
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `Erreur ${r.status}`);
  return d;
}
const send = (url: string, method: string, body?: unknown) =>
  fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }).then(r => json<any>(r));

export const mediaUrl = (id: number) => `/api/actualites/medias/${id}`;

// Mêmes opérations depuis l'espace membre (publier remplace « save » ; pas de brouillon)
export const mediaMembre = (id: number) => `/api/espace/actualites/medias/${id}`;
export const newsMembre = {
  feed: () => fetch('/api/espace/actualites').then(r => json<News[]>(r)),
  save: (id: number | null, form: FormData) => fetch(id ? `/api/espace/actualites/${id}` : '/api/espace/actualites', { method: id ? 'PATCH' : 'POST', body: form }).then(r => json<{ id: number }>(r)),
  publish: (_id: number, _publie: boolean): Promise<unknown> => Promise.reject(new Error('Action réservée à la Chambre')),
  remove: (id: number) => send(`/api/espace/actualites/${id}`, 'DELETE'),
  react: (id: number, emoji: string) => send(`/api/espace/actualites/${id}/reaction`, 'POST', { emoji }),
  comment: (id: number, texte: string, parent_id?: number | null) => send(`/api/espace/actualites/${id}/commentaires`, 'POST', { texte, parent_id }),
  editComment: (cid: number, texte: string) => send(`/api/espace/actualites/commentaires/${cid}`, 'PATCH', { texte }),
  deleteComment: (cid: number) => send(`/api/espace/actualites/commentaires/${cid}`, 'DELETE'),
  reactComment: (cid: number, emoji: string) => send(`/api/espace/actualites/commentaires/${cid}/reaction`, 'POST', { emoji }),
};

export const news = {
  list: () => fetch('/api/actualites').then(r => json<NewsItem[]>(r)),
  get: (id: number) => fetch(`/api/actualites/${id}`).then(r => json<News>(r)),
  feed: () => fetch('/api/actualites/flux').then(r => json<News[]>(r)),
  save: (id: number | null, form: FormData) => fetch(id ? `/api/actualites/${id}` : '/api/actualites', { method: id ? 'PATCH' : 'POST', body: form }).then(r => json<{ id: number }>(r)),
  publish: (id: number, publie: boolean) => send(`/api/actualites/${id}`, 'PATCH', { publie }),
  remove: (id: number) => send(`/api/actualites/${id}`, 'DELETE'),
  react: (id: number, emoji: string) => send(`/api/actualites/${id}/reaction`, 'POST', { emoji }),
  comment: (id: number, texte: string, parent_id?: number | null) => send(`/api/actualites/${id}/commentaires`, 'POST', { texte, parent_id }),
  editComment: (cid: number, texte: string) => send(`/api/actualites/commentaires/${cid}`, 'PATCH', { texte }),
  deleteComment: (cid: number) => send(`/api/actualites/commentaires/${cid}`, 'DELETE'),
  reactComment: (cid: number, emoji: string) => send(`/api/actualites/commentaires/${cid}/reaction`, 'POST', { emoji }),
};

// Mentions : on tape « @Rina », le texte enregistré contient « @[Rina](user:3) »
const TOKEN = /@\[([^\]\n]{1,80})\]\((user|member):(\d{1,9})\)/g;

export function fromStored(t: string | null): { text: string; mentions: Person[] } {
  const mentions: Person[] = [];
  const text = (t ?? '').replace(TOKEN, (_, nom: string, kind: Person['kind'], id: string) => {
    if (!mentions.some(m => m.kind === kind && m.id === Number(id))) mentions.push({ kind, id: Number(id), nom });
    return '@' + nom;
  });
  return { text, mentions };
}

export function toStored(text: string, mentions: Person[]) {
  let out = text;
  // Noms les plus longs d'abord : « @Rina Rabe » avant « @Rina »
  for (const m of [...mentions].sort((a, b) => b.nom.length - a.nom.length)) {
    const esc = m.nom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`@${esc}(?![\\p{L}\\d])`, 'gu'), `@[${m.nom}](${m.kind}:${m.id})`);
  }
  return out;
}

// Découpe un texte en morceaux affichables : mention, #mot-clé, lien ou texte simple
export type Piece = { t: 'text' | 'tag' | 'link'; v: string } | { t: 'mention'; v: string; kind: string; id: number };
const PIECES = /@\[([^\]\n]{1,80})\]\((user|member):(\d{1,9})\)|(^|[^\p{L}\d&])#([\p{L}\d_-]{1,40})|(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"»])/gu;

export function pieces(t: string): Piece[] {
  const out: Piece[] = [];
  let last = 0;
  for (const m of t.matchAll(PIECES)) {
    let start = m.index!;
    if (m[5]) start += m[4].length;   // le caractère avant « # » reste du texte
    if (start > last) out.push({ t: 'text', v: t.slice(last, start) });
    if (m[1]) out.push({ t: 'mention', v: m[1], kind: m[2], id: Number(m[3]) });
    else if (m[5]) out.push({ t: 'tag', v: m[5] });
    else out.push({ t: 'link', v: m[6] });
    last = m.index! + m[0].length;
  }
  if (last < t.length) out.push({ t: 'text', v: t.slice(last) });
  return out;
}

export const isVideo = (type: string) => type.startsWith('video/');
