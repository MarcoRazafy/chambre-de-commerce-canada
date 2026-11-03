'use client';
import Link from 'next/link';
import type { Field } from '@/lib/resources';
import { display, relative, type Row } from '@/lib/format';
import Avatar from './Avatar';
import StatusBadge from './StatusBadge';

// Tables dont la première colonne porte une photo ou un logo
const AVATAR: Record<string, string> = { members: 'member', team_users: 'user' };
// Libellés des cases à cocher plus parlants que Oui / Non
// Mot affiché quand la case est vide, à la place du tiret
const EMPTY: Record<string, string> = { derniere_connexion: 'Jamais' };
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
  if (v == null || v === '') return <span className="cell-none">{EMPTY[f.name] ?? '—'}</span>;
  if (f.name === 'statut') return <StatusBadge value={v} label={text} />;
  if (f.type === 'select') return <span className="pill">{text}</span>;
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
