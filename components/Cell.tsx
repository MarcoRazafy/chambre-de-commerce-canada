'use client';
import Link from 'next/link';
import type { Field } from '@/lib/resources';
import { display, optValue, relative, type Row } from '@/lib/format';
import Avatar from './Avatar';
import StatusBadge from './StatusBadge';

// Tables dont la première colonne porte une photo ou un logo
const AVATAR: Record<string, string> = { members: 'member', team_users: 'user' };
// Libellés des cases à cocher plus parlants que Oui / Non
const BOOL: Record<string, [string, string]> = { actif: ['Actif', 'Inactif'], publie: ['Publié', 'Brouillon'], present: ['Présent', 'Absent'], lu: ['Lue', 'Non lue'] };

type P = { f: Field; row: Row; refs: Record<string, Row[]>; labelOf: (t: string) => string; table: string; first: boolean; href?: string };

// Une cellule du tableau, mise en forme selon le type du champ
export default function Cell({ f, row, refs, labelOf, table, first, href }: P) {
  const v = row[f.name];
  const text = display(f, row, refs, labelOf);

  if (first && !(f.type === 'select' && !href && !AVATAR[table])) {
    const name = <b>{text}</b>;
    return (
      <span className="cell-main">
        {AVATAR[table] && <Avatar kind={AVATAR[table]} id={row.id} size={32} />}
        {href ? <Link href={href}>{name}</Link> : name}
      </span>
    );
  }
  if (v == null || v === '') return <span className="cell-none">—</span>;
  if (f.name === 'statut') return <StatusBadge value={v} label={text} />;
  if (f.type === 'select') {
    // Couleur fixée par la position de l'option : une valeur garde toujours la même teinte
    const i = Math.max(0, (f.options ?? []).findIndex(o => optValue(o) === v));
    return <span className={`pill cat-${(i % 6) + 1}`}>{text}</span>;
  }
  if (f.type === 'bool') {
    const [yes, no] = BOOL[f.name] ?? ['Oui', 'Non'];
    return <span className={`state${v ? ' on' : ''}`}>{v ? yes : no}</span>;
  }
  if (f.type === 'datetime' || f.type === 'date') {
    const rel = f.type === 'datetime' ? relative(v) : null;
    return <time dateTime={String(v)} title={text}>{rel ?? text}</time>;
  }
  if (f.type === 'tags') return <span className="tags">{(v as string[]).map(t => <span key={t} className="tag">{t}</span>)}</span>;
  if (f.name === 'email') return <a className="cell-mail" href={`mailto:${v}`}>{text}</a>;
  return <>{text}</>;
}
