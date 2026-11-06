'use client';
import { useCallback, useEffect, useState } from 'react';
import { RESOURCES } from '@/lib/resources';
import { api, type Row } from '@/lib/format';
import { downloadCsv } from '@/lib/ui-actions';
import Icon from './Icon';

const R = RESOURCES.journal;
const CATS: Record<string, string> = { 'Adhésions': 'users', Paiements: 'coin', Contenus: 'news', 'Événements': 'cal', Communication: 'chat', 'Équipe': 'team', 'Système': 'gear' };
const PAGE = 60;
const dayKey = (v: string) => new Date(v).toDateString();
// « Aujourd'hui », « Hier », « Mardi 3 novembre »
function dayLabel(v: string) {
  const d = new Date(v), t = new Date();
  const y = new Date(t); y.setDate(t.getDate() - 1);
  if (d.toDateString() === t.toDateString()) return 'Aujourd’hui';
  if (d.toDateString() === y.toDateString()) return 'Hier';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', ...(d.getFullYear() !== t.getFullYear() ? { year: 'numeric' } : {}) });
}
const hm = (v: string) => new Date(v).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

// Journal d'activité : fil chronologique groupé par jour, une icône par catégorie, filtres par catégorie
export default function Journal() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [cat, setCat] = useState('');
  const [term, setTerm] = useState('');
  const [n, setN] = useState(PAGE);
  const [connexions, setConnexions] = useState(false);   // les simples connexions noient les vraies actions : masquées par défaut
  const [error, setError] = useState('');

  const load = useCallback(() => api<Row[]>('/api/journal').then(r => { setRows(r); setError(''); }).catch(e => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const all = (rows ?? []).filter(r => connexions || r.titre !== 'Connexion');
  const cats = Object.keys(CATS).filter(c => all.some(r => r.categorie === c));
  const shown = all.filter(r => (!cat || r.categorie === cat) && (!term || [r.titre, r.detail, r.par].join(' ').toLowerCase().includes(term.toLowerCase())));
  const page = shown.slice(0, n);
  const groups: [string, Row[]][] = [];
  for (const r of page) {
    const k = dayKey(r.created_at), last = groups.at(-1);
    if (last && last[0] === k) last[1].push(r); else groups.push([k, [r]]);
  }
  const cols = R.fields.filter(f => f.list);
  const exportCsv = () => downloadCsv(R.title, [...cols.map(f => f.label), 'Date'], shown.map(r => [...cols.map(f => String(r[f.name] ?? '')), new Date(r.created_at).toLocaleString('fr-FR')]));

  return (
    <>
      <div className="head og-head"><div><h1>Journal d’activité</h1><p className="muted">Qui a fait quoi, et quand.</p></div><div className="actions">
        <label className="fs-switch jr-cnx"><input type="checkbox" className="switch" checked={connexions} onChange={e => { setConnexions(e.target.checked); setN(PAGE); }} /><span><b>Afficher aussi les connexions</b></span></label>
        <button className="btn" onClick={exportCsv} disabled={!shown.length}><Icon name="download" size={16} /> Exporter</button>
      </div></div>
      {error && <div className="err">{error}</div>}

      {rows === null ? <div className="card"><div className="skeleton"><span /><span /><span /></div></div> : (
        <section className="card jr">
          <div className="dir-tools">
            <label className="search-inp dir-search"><Icon name="search" size={16} />
              <input className="inp" placeholder="Rechercher une action, un détail, une personne…" aria-label="Rechercher dans le journal" value={term} onChange={e => { setTerm(e.target.value); setN(PAGE); }} /></label>
            <span className="small muted dir-count">{shown.length} action{shown.length > 1 ? 's' : ''}</span>
          </div>
          <div className="jr-cats" role="group" aria-label="Catégorie">
            <button type="button" className={!cat ? 'on' : ''} aria-pressed={!cat} onClick={() => { setCat(''); setN(PAGE); }}>Tout · {all.length}</button>
            {cats.map(c => <button type="button" key={c} className={cat === c ? 'on' : ''} aria-pressed={cat === c} onClick={() => { setCat(cat === c ? '' : c); setN(PAGE); }}>
              <Icon name={CATS[c]} size={14} />{c} · {all.filter(r => r.categorie === c).length}</button>)}
          </div>

          {groups.length === 0 ? <div className="empty-state"><b>Aucune action ne correspond</b></div> : groups.map(([k, list]) => (
            <div key={k} className="jr-day">
              <h3 className="jr-day-h cap1">{dayLabel(list[0].created_at)}</h3>
              <ol className="jr-list">
                {list.map(r => (
                  <li key={r.id} className="jr-item">
                    <span className="tile-ic xs"><Icon name={CATS[r.categorie] ?? 'log'} size={14} fill /></span>
                    <div className="jr-body">
                      <div className="jr-line"><b>{r.titre}</b><span className="jr-cat">{r.categorie}</span></div>
                      {r.detail && <p>{r.detail}</p>}
                    </div>
                    <div className="jr-meta"><span className="jr-by"><Icon name="user" size={12} />{r.par || '—'}</span><time dateTime={r.created_at}>{hm(r.created_at)}</time></div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
          {shown.length > n && <button type="button" className="btn sm" style={{ alignSelf: 'center' }} onClick={() => setN(x => x + PAGE)}>Voir plus ({shown.length - n} restantes)</button>}
        </section>
      )}
    </>
  );
}
