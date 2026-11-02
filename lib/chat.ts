// Outils côté navigateur pour la messagerie (page Messagerie et fenêtre flottante)
import type { Row } from './format';

export type Thread = Row & { id: number; type: 'membre' | 'groupe' | 'equipe'; titre: string; avatar: { kind: string; id: number } | null; non_lu: boolean };
export type Person = { kind: 'user' | 'member'; id: number; nom: string; detail?: string };

export const FILTRES: [string, string][] = [
  ['tous', 'Tous'], ['non-lus', 'Non lus'], ['importants', 'Importants'], ['membres', 'Membres'],
  ['groupes', 'Groupes'], ['equipe', 'Équipe'], ['archivees', 'Archivées'],
];

export const EMOJIS = ['😀', '😊', '😂', '🙂', '😉', '😍', '🤝', '👍', '👏', '🙏', '💪', '🎉', '✅', '❌', '⚠️', '📌', '📎', '📅', '📞', '✉️',
  '💡', '🚀', '🔥', '⭐', '❤️', '😅', '🤔', '😮', '😢', '👀', '🇲🇬', '🇨🇦', '🌍', '💼', '📈', '🧾', '💰', '☕', '🕐', '👋'];

async function json<T>(res: Response): Promise<T> {
  if (res.status === 401) window.location.href = '/connexion';
  if (res.status === 204) return null as T;
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || `Erreur ${res.status}`);
  return d;
}

export const chat = {
  list: (filtre = 'tous', q = '') => fetch(`/api/messagerie?filtre=${filtre}&q=${encodeURIComponent(q)}`).then(r => json<Thread[]>(r)),
  get: (id: number) => fetch(`/api/messagerie/${id}`).then(r => json<Row>(r)),
  create: (body: { user_ids: number[]; member_ids: number[]; sujet?: string }) =>
    fetch('/api/messagerie', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => json<Row>(r)),
  send: (id: number, texte: string, files: File[], entrant?: number | null) => {
    const f = new FormData();
    f.set('texte', texte);
    files.forEach(x => f.append('files', x));
    if (entrant) f.set('entrant', String(entrant));
    return fetch(`/api/messagerie/${id}`, { method: 'POST', body: f }).then(r => json<Row>(r));
  },
  patch: (id: number, body: Row) => fetch(`/api/messagerie/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => json<Row>(r)),
  remove: (id: number) => fetch(`/api/messagerie/${id}`, { method: 'DELETE' }).then(r => json<null>(r)),
  addPeople: (id: number, user_ids: number[], member_ids: number[]) =>
    fetch(`/api/messagerie/${id}/participants`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_ids, member_ids }) }).then(r => json<{ id: number }>(r)),
  removePerson: (id: number, kind: string, ref: number) => fetch(`/api/messagerie/${id}/participants?kind=${kind}&ref=${ref}`, { method: 'DELETE' }).then(r => json<null>(r)),
  editMsg: (mid: number, texte: string) => fetch(`/api/messagerie/messages/${mid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texte }) }).then(r => json<Row>(r)),
  deleteMsg: (mid: number) => fetch(`/api/messagerie/messages/${mid}`, { method: 'DELETE' }).then(r => json<null>(r)),
  people: (q: string) => fetch(`/api/messagerie/personnes?q=${encodeURIComponent(q)}`).then(r => json<Person[]>(r)),
};

// Signale aux autres vues (liste, fenêtre flottante, compteurs) qu'une conversation a changé
export const chatChanged = () => window.dispatchEvent(new Event('cc:chat'));

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
export function shortDate(d: string) {
  const x = new Date(d), now = new Date();
  if (sameDay(x, now)) return x.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const hier = new Date(now); hier.setDate(now.getDate() - 1);
  if (sameDay(x, hier)) return 'Hier';
  return x.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', ...(x.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) });
}
export function dayLabel(d: string) {
  const x = new Date(d), now = new Date(), hier = new Date(now);
  hier.setDate(now.getDate() - 1);
  if (sameDay(x, now)) return 'Aujourd’hui';
  if (sameDay(x, hier)) return 'Hier';
  return x.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', ...(x.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) });
}
export const hm = (d: string) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
export const size = (n: number) => n < 1024 ? n + ' o' : n < 1048576 ? Math.round(n / 1024) + ' Ko' : (n / 1048576).toFixed(1).replace('.', ',') + ' Mo';

export function preview(t: Thread, meId?: number) {
  if (!t.dernier_at) return t.type === 'groupe' ? 'Groupe créé' : 'Aucun message';
  if (t.dernier_supprime) return 'Message supprimé';
  const who = t.dernier_auteur === meId ? 'Vous : ' : '';
  const txt = t.dernier || (t.dernier_fichiers ? `📎 ${t.dernier_fichiers} pièce(s) jointe(s)` : '');
  return who + txt;
}
