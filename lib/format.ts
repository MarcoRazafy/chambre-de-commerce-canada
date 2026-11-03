import type { Field, Opt } from './resources';

export type Row = Record<string, any>;
export type Ligne = { des: string; mt: number };

export const optValue = (o: Opt) => (Array.isArray(o) ? o[0] : o);
export const optLabel = (o: Opt) => (Array.isArray(o) ? o[1] : o);

export const total = (lignes: Ligne[] | null) => (lignes ?? []).reduce((a, l) => a + (Number(l.mt) || 0), 0);

// Sous-total, TPS/TVQ (factures en $ CA si activé dans les réglages) et total
export function invoiceTotals(inv: { lignes: Ligne[] | null; devise: string }, org: Row) {
  const sub = total(inv.lignes), tax = inv.devise === 'CAD' && !!org.taxesCAD;
  const tps = tax ? Math.round(sub * (Number(org.tpsRate) || 0)) / 100 : 0;
  const tvq = tax ? Math.round(sub * (Number(org.tvqRate) || 0)) / 100 : 0;
  return { sub, tps, tvq, total: sub + tps + tvq };
}

export function money(n: number | null, cur = 'MGA') {
  if (n == null) return 'Sur devis';
  return cur === 'CAD'
    ? new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(n)
    : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' Ar';
}

// Valeur ISO → valeur d'un <input type="datetime-local"> à l'heure locale
export function isoLocal(v: string) {
  const x = new Date(v);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 16);
}

// refs : table → lignes, pour afficher le libellé d'une clé étrangère
export function display(f: Field, row: Row, refs: Record<string, Row[]>, labelOf: (table: string) => string) {
  const v = row[f.name];
  if (f.type === 'lignes') return money(total(v), row.devise);
  if (v == null || v === '') return '—';
  switch (f.type) {
    case 'bool': return v ? 'Oui' : 'Non';
    case 'date': return new Date(v + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    case 'datetime': return new Date(v).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    case 'number': return Number(v).toLocaleString('fr-FR');
    case 'tags': return v.length ? v.join(', ') : '—';
    case 'select': { const o = f.options?.find(o => optValue(o) === v); return o ? optLabel(o) : v; }
    case 'ref': { const r = refs[f.ref!]?.find(x => x.id === v); return r ? String(r[labelOf(f.ref!)]) : '#' + v; }
    default: return String(v);
  }
}

// Pastille d'un statut (toutes tables confondues) : teinte pâle + icône colorée
const TONES: Record<string, string> = {
  a_jour: 'c-green', payee: 'c-green', 'confirmé': 'c-green', 'Envoyée': 'c-green', 'envoyé': 'c-green', 'Abonné': 'c-green', relation: 'c-green', actif: 'c-green',
  retard: 'c-red', 'échec': 'c-red', 'rejeté': 'c-red', Rebond: 'c-red',
  attente: 'c-amber', 'annoncé': 'c-amber', 'programmé': 'c-amber', 'Programmée': 'c-amber',
  demande: 'c-blue', envoyee: 'c-blue',
};
const TONE_ICON: Record<string, string> = { 'c-green': 'ok', 'c-red': 'alert', 'c-amber': 'clock', 'c-blue': 'new', 'c-grey': 'minus' };
export const tone = (v: unknown) => TONES[String(v)] ?? 'c-grey';
export const toneIcon = (v: unknown) => (String(v) === 'envoyee' ? 'send' : TONE_ICON[tone(v)]);

export async function api<T = any>(url: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 401 && typeof window !== 'undefined') window.location.href = '/connexion';
  if (res.status === 204) return null as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data;
}

// Date passée récente en langage courant (« il y a 3 h », « hier ») ; au-delà d'une semaine ou dans le futur : null
export function relative(v: string | Date, now = Date.now()) {
  const d = new Date(v).getTime();
  const min = Math.round((now - d) / 60000);
  if (min < 0 || min > 7 * 1440) return null;
  if (min < 1) return 'à l’instant';
  if (min < 60) return `il y a ${min} min`;
  if (min < 1440) return `il y a ${Math.round(min / 60)} h`;
  const days = Math.round(min / 1440);
  return days === 1 ? 'hier' : `il y a ${days} jours`;
}

// Adresse d'image saisie à la main : acceptée seulement en http(s)
export const imageUrl = (v: unknown) => (typeof v === 'string' && /^https?:\/\/\S+$/i.test(v.trim()) ? v.trim() : null);
