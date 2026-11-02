'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, type Row } from '@/lib/format';

type Ev = { d: Date; t: string; cls: string; href: string };
const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const ymd = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

// Calendrier mensuel : événements (rouge), rendez-vous (vert) et rappels de l'équipe (bleu)
export default function Calendar() {
  const [month, setMonth] = useState<Date | null>(null);   // fixé au chargement (pas pendant la compilation)
  const thisMonth = () => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); };
  const [items, setItems] = useState<Ev[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    thisMonth();
    Promise.all(['events', 'rendez_vous', 'agenda_rappels', 'members', 'rdv_types'].map(t => api<Row[]>('/api/' + t)))
      .then(([evs, rdv, rap, mem, types]) => {
        const nom = (list: Row[], id: number, k = 'nom') => list.find(x => x.id === id)?.[k] ?? '';
        setItems([
          ...evs.map(e => ({ d: new Date(e.date_debut), t: e.titre, cls: 'c-red', href: `/evenements/${e.id}` })),
          ...rdv.map(r => ({ d: new Date(r.date_debut), t: `${nom(types, r.type_id)} — ${nom(mem, r.member_id)}`, cls: 'c-green', href: '/rendez-vous' })),
          ...rap.map(r => ({ d: new Date(r.date_debut), t: r.titre, cls: 'c-blue', href: '/agenda' })),
        ]);
      })
      .catch(e => setError(e.message));
  }, []);

  if (!month) return <div className="card"><div className="empty">Chargement…</div></div>;
  const start = new Date(month);
  start.setDate(1 - ((month.getDay() + 6) % 7));        // lundi de la première semaine
  const days = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const today = ymd(new Date());
  const move = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const hm = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="card">
      <div className="card-h">
        <h2 style={{ textTransform: 'capitalize' }}>{month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</h2>
        <div className="actions">
          <button className="btn sm" onClick={() => move(-1)} aria-label="Mois précédent">‹</button>
          <button className="btn sm" onClick={thisMonth}>Aujourd’hui</button>
          <button className="btn sm" onClick={() => move(1)} aria-label="Mois suivant">›</button>
        </div>
      </div>
      {error && <div className="err">{error}</div>}
      <div className="row small"><span className="chip c-red">Événement</span><span className="chip c-green">Rendez-vous</span><span className="chip c-blue">Rappel</span></div>
      <div className="cal">
        {JOURS.map(j => <div className="dh" key={j}>{j}</div>)}
        {days.map(d => {
          const evs = items.filter(e => ymd(e.d) === ymd(d)).sort((a, b) => +a.d - +b.d);
          return (
            <div key={+d} className={`d${d.getMonth() !== month.getMonth() ? ' out' : ''}${ymd(d) === today ? ' today' : ''}${evs.length ? ' has' : ''}`}>
              <b>{d.getDate()}</b>
              {evs.map((e, i) => <Link key={i} href={e.href} className={`ev chip ${e.cls}`} title={`${hm(e.d)} · ${e.t}`}>{hm(e.d)} {e.t}</Link>)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
