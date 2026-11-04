'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, type Row } from '@/lib/format';
import Icon from './Icon';
import ResourcePage, { EditModal } from './ResourcePage';

type Kind = 'event' | 'rdv' | 'rappel';
type Ev = { d: Date; t: string; kind: Kind; href: string; sub?: string };
const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const KINDS: { k: Kind; label: string; icon: string }[] = [
  { k: 'event', label: 'Événements', icon: 'cal' },
  { k: 'rdv', label: 'Rendez-vous', icon: 'spark' },
  { k: 'rappel', label: 'Rappels', icon: 'bell' },
];
const ICON: Record<Kind, string> = { event: 'cal', rdv: 'spark', rappel: 'bell' };
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hm = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const MAX_IN_CELL = 3;

// Agenda : calendrier du mois (événements, rendez-vous, rappels de l'équipe), filtres par type,
// panneau du jour choisi et des prochaines échéances, puis la liste des rappels
export default function Calendar() {
  const [month, setMonth] = useState<Date | null>(null);   // fixé au chargement (pas pendant la compilation)
  const [day, setDay] = useState<string>('');
  const [items, setItems] = useState<Ev[]>([]);
  const [hidden, setHidden] = useState<Kind[]>([]);
  const [adding, setAdding] = useState<Row | null>(null);
  const [v, setV] = useState(0);
  const [error, setError] = useState('');
  const thisMonth = () => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); setDay(ymd(d)); };

  const load = useCallback(() => {
    Promise.all(['events', 'rendez_vous', 'agenda_rappels', 'members', 'rdv_types'].map(t => api<Row[]>('/api/' + t)))
      .then(([evs, rdv, rap, mem, types]) => {
        const nom = (list: Row[], id: number) => list.find(x => x.id === id)?.nom ?? '';
        setItems([
          ...evs.map(e => ({ d: new Date(e.date_debut), t: e.titre, kind: 'event' as const, href: `/evenements/${e.id}`, sub: e.lieu ?? e.format })),
          ...rdv.map(r => ({ d: new Date(r.date_debut), t: nom(types, r.type_id) || 'Rendez-vous', kind: 'rdv' as const, href: '/rendez-vous', sub: nom(mem, r.member_id) })),
          ...rap.map(r => ({ d: new Date(r.date_debut), t: r.titre, kind: 'rappel' as const, href: '/agenda', sub: r.note ?? undefined })),
        ].sort((a, b) => +a.d - +b.d));
        setError('');
      })
      .catch(e => setError(e.message));
  }, []);
  useEffect(() => { thisMonth(); load(); }, [load]);

  if (!month) return <div className="card"><div className="skeleton"><span /><span /><span /></div></div>;
  const start = new Date(month);
  start.setDate(1 - ((month.getDay() + 6) % 7));        // lundi de la première semaine
  const weeks = Math.ceil((((month.getDay() + 6) % 7) + new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()) / 7);
  const days = Array.from({ length: weeks * 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const today = ymd(new Date());
  const move = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const visible = items.filter(e => !hidden.includes(e.kind));
  const inMonth = items.filter(e => e.d.getMonth() === month.getMonth() && e.d.getFullYear() === month.getFullYear());
  const count = (k: Kind) => inMonth.filter(e => e.kind === k).length;
  const ofDay = (key: string) => visible.filter(e => ymd(e.d) === key);
  const upcoming = visible.filter(e => +e.d >= Date.now()).slice(0, 6);
  const dayLabel = day ? new Date(day + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
  const toggle = (k: Kind) => setHidden(h => (h.includes(k) ? h.filter(x => x !== k) : [...h, k]));

  const Item = ({ e, withDate }: { e: Ev; withDate?: boolean }) => (
    <li>
      <Link href={e.href} className={`agi k2-${e.kind}`}>
        <span className="tile-ic"><Icon name={ICON[e.kind]} size={18} fill /></span>
        <span className="agi-txt">
          <b>{e.t}</b>
          <span>{withDate && <span className="cap1">{e.d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · </span>}{hm(e.d)}{e.sub ? ` · ${e.sub}` : ''}</span>
        </span>
      </Link>
    </li>
  );

  return (
    <>
      {error && <div className="err">{error}</div>}
      <div className="ag">
        <section className="card ag-main">
          <div className="ag-head">
            <h2 className="ag-title"><span className="cap1">{month.toLocaleDateString('fr-FR', { month: 'long' })}</span> <span>{month.getFullYear()}</span></h2>
            <div className="ag-nav">
              <button className="icon-btn" onClick={() => move(-1)} aria-label="Mois précédent"><Icon name="back" size={18} /></button>
              <button className="btn sm" onClick={thisMonth}>Aujourd’hui</button>
              <button className="icon-btn flip" onClick={() => move(1)} aria-label="Mois suivant"><Icon name="back" size={18} /></button>
            </div>
          </div>
          <div className="ag-filters" role="group" aria-label="Afficher">
            {KINDS.map(({ k, label, icon }) => (
              <button key={k} type="button" className={`ag-filter k2-${k}${hidden.includes(k) ? ' off' : ''}`} aria-pressed={!hidden.includes(k)} onClick={() => toggle(k)}>
                <Icon name={icon} size={14} />{label}<span className="ag-n">{count(k)}</span>
              </button>
            ))}
          </div>
          <div className="ag-grid" role="grid" aria-label="Calendrier du mois">
            {JOURS.map((j, i) => <div className={`ag-dh${i > 4 ? ' we' : ''}`} key={j} role="columnheader">{j}</div>)}
            {days.map(d => {
              const key = ymd(d), evs = ofDay(key);
              const cls = ['ag-d', d.getMonth() !== month.getMonth() && 'out', key === today && 'today', key === day && 'sel', (d.getDay() === 0 || d.getDay() === 6) && 'we'].filter(Boolean).join(' ');
              return (
                <div key={key} className={cls} role="gridcell" aria-selected={key === day}>
                  <button type="button" className="ag-num" onClick={() => setDay(key)} aria-label={d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) + (evs.length ? `, ${evs.length} élément(s)` : '')}>{d.getDate()}</button>
                  {evs.slice(0, MAX_IN_CELL).map((e, i) => <Link key={i} href={e.href} className={`ag-ev k2-${e.kind}`} title={`${hm(e.d)} · ${e.t}`}><span>{hm(e.d)}</span>{e.t}</Link>)}
                  {evs.length > MAX_IN_CELL && <button type="button" className="ag-more" onClick={() => setDay(key)}>+{evs.length - MAX_IN_CELL} autre{evs.length - MAX_IN_CELL > 1 ? 's' : ''}</button>}
                  {evs.length > 0 && <span className="ag-dots" aria-hidden="true">{evs.slice(0, 3).map((e, i) => <i key={i} className={`k2-${e.kind}`} />)}</span>}
                </div>
              );
            })}
          </div>
        </section>

        <aside className="ag-side">
          <section className="card">
            <div className="row between">
              <h2 className="cap1">{dayLabel}</h2>
              <button className="btn sm" onClick={() => setAdding({ date_debut: `${day}T09:00` })}><Icon name="plus" size={14} /> Rappel</button>
            </div>
            {ofDay(day).length === 0 ? <p className="small muted">Rien de prévu ce jour-là.</p> : <ul className="agi-list">{ofDay(day).map((e, i) => <Item key={i} e={e} />)}</ul>}
          </section>
          <section className="card">
            <h2>À venir</h2>
            {upcoming.length === 0 ? <p className="small muted">Aucune échéance à venir.</p> : <ul className="agi-list">{upcoming.map((e, i) => <Item key={i} e={e} withDate />)}</ul>}
          </section>
        </aside>
      </div>
      <ResourcePage key={v} table="agenda_rappels" bare />
      {adding && <EditModal table="agenda_rappels" row={adding} refs={{}} onClose={() => setAdding(null)} onSaved={() => { setAdding(null); load(); setV(x => x + 1); }} />}
    </>
  );
}
