'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RESOURCES } from '@/lib/resources';
import { api, relative, type Row } from '@/lib/format';
import { downloadCsv, parseCsv, runAction } from '@/lib/ui-actions';
import { toast } from '@/lib/toast';
import Icon from './Icon';
import StatusBadge from './StatusBadge';
import { Stack } from './Newsletter';
import { EditModal } from './ResourcePage';

const R = RESOURCES.subscribers;
const STATUTS = ['Abonné', 'Désabonné', 'Rebond'] as const;
const STATUT_LABEL: Record<string, string> = { 'Abonné': 'Abonné', 'Désabonné': 'Désabonné', Rebond: 'Adresse en échec' };
// Teintes de la charte pour les initiales (mêmes que les avatars générés côté serveur)
const COLORS = ['#2C4A6B', '#0E6767', '#2D6440', '#9A6512', '#9E4026', '#8A3651', '#0B1B33', '#4F5D73'];
const initials = (s: Row) => ((s.nom || s.email).split(/[\s@.]+/).filter((w: string) => /^\p{L}/u.test(w)).slice(0, 2).map((w: string) => w[0].toUpperCase()).join('') || '?');
const color = (s: string) => COLORS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
const longDate = (v: string) => new Date(v.slice(0, 10) + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const SOURCE_ICON = (src: string) => /csv|import/i.test(src) ? 'download' : /événement|evenement|webinaire/i.test(src) ? 'cal' : /public|vitrine|site|formulaire/i.test(src) ? 'store' : 'tag';

// Page Abonnés à la lettre : chiffres clés, provenance des inscriptions, liste lisible (avatar, nom et courriel, source, date, statut)
export default function Abonnes() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState('');
  const [term, setTerm] = useState('');
  const [editing, setEditing] = useState<Row | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => api<Row[]>('/api/subscribers').then(r => { setRows(r); setError(''); }).catch(e => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  async function importCsv(file: File) {
    const list = parseCsv(await file.text());
    if (fileRef.current) fileRef.current.value = '';
    if (!list.length) return setError('Fichier vide');
    try { toast(await runAction('subscribers-import', { rows: list })); load(); } catch (e) { setError((e as Error).message); }
  }

  const all = rows ?? [];
  const n = (st: string) => all.filter(s => s.statut === st).length;
  const recent = all.filter(s => s.statut === 'Abonné' && Date.now() - new Date(s.date_inscription).getTime() < 30 * 864e5).length;
  const sources = Object.entries(all.reduce<Record<string, number>>((a, s) => { const k = s.source || 'Autre'; a[k] = (a[k] ?? 0) + 1; return a; }, {})).sort((a, b) => b[1] - a[1]);
  const top = sources.slice(0, 3), rest = sources.slice(3).reduce((a, [, c]) => a + c, 0);
  const shown = all.filter(s => (!filter || s.statut === filter) && (!term || [s.email, s.nom, s.source].join(' ').toLowerCase().includes(term.toLowerCase())));
  const cols = R.fields.filter(f => f.list);
  const exportCsv = () => downloadCsv(R.title, cols.map(f => f.label), shown.map(s => cols.map(f => String(s[f.name] ?? ''))));

  return (
    <>
      <div className="head page-tools"><div className="actions">
        <a className="btn" href="/inscription" target="_blank" rel="noopener">Formulaire public</a>
        <button className="btn" onClick={() => fileRef.current?.click()}>Importer un CSV</button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={e => e.target.files?.[0] && importCsv(e.target.files[0])} />
        <button className="btn" onClick={exportCsv} disabled={!shown.length}>Exporter</button>
        <button className="btn cta" onClick={() => setEditing({ statut: 'Abonné' })}><Icon name="plus" size={16} /> Ajouter</button>
      </div></div>
      {error && <div className="err">{error}</div>}

      {rows === null ? <div className="card"><div className="skeleton"><span /><span /><span /></div></div> : (
        <>
          <div className="grid g4">
            <div className="card stat mkpi">
              <div className="stat-h"><span className="stat-l">Abonnés actifs</span><span className="stat-ic tile-ic"><Icon name="users" size={18} fill /></span></div>
              <div className="kpi-v"><span className="stat-v num">{n('Abonné')}</span>{recent > 0 && <span className="kpi-delta up">▲ {recent} en 30 jours</span>}</div>
              <span className="stat-s">sur {all.length} adresse{all.length > 1 ? 's' : ''} enregistrée{all.length > 1 ? 's' : ''}</span>
            </div>
            <div className="card stat mkpi">
              <div className="stat-h"><span className="stat-l">Désabonnés</span><span className="stat-ic tile-ic"><Icon name="minus" size={18} fill /></span></div>
              <div className="kpi-v"><span className="stat-v num">{n('Désabonné')}</span></div>
              <span className="stat-s">{all.length ? `${Math.round((n('Désabonné') / all.length) * 100)} % des inscrits` : '—'}</span>
            </div>
            <div className="card stat mkpi">
              <div className="stat-h"><span className="stat-l">Adresses en échec</span><span className="stat-ic tile-ic"><Icon name="alert" size={18} fill /></span></div>
              <div className="kpi-v"><span className="stat-v num">{n('Rebond')}</span></div>
              <span className="stat-s">courriels qui n’arrivent pas</span>
            </div>
            <div className="card stat mkpi">
              <div className="stat-h"><span className="stat-l">Provenance</span><span className="stat-ic tile-ic"><Icon name="spark" size={18} fill /></span></div>
              <Stack parts={[...top.map(([label, c], i) => ({ label, n: c, cls: ['k-a', 'k-b', 'k-c'][i] })), ...(rest ? [{ label: 'autres', n: rest, cls: 'k-c' }] : [])]} />
            </div>
          </div>

          <section className="card sub-card">
            <div className="dir-tools">
              <label className="search-inp dir-search"><Icon name="search" size={16} />
                <input className="inp" placeholder="Rechercher un nom, un courriel, une source…" aria-label="Rechercher un abonné" value={term} onChange={e => setTerm(e.target.value)} /></label>
              <div className="seg" role="group" aria-label="Statut">
                <button type="button" className={!filter ? 'on' : ''} aria-pressed={!filter} onClick={() => setFilter('')}>Tous · {all.length}</button>
                {STATUTS.map(st => <button type="button" key={st} className={filter === st ? 'on' : ''} aria-pressed={filter === st} onClick={() => setFilter(st)}>{st === 'Rebond' ? 'En échec' : st + 's'} · {n(st)}</button>)}
              </div>
            </div>

            {shown.length === 0 ? (
              <div className="empty-state"><b>{all.length ? 'Aucun abonné ne correspond' : 'Aucun abonné pour le moment'}</b>
                {all.length ? <button className="btn sm" onClick={() => { setFilter(''); setTerm(''); }}>Voir tous les abonnés</button>
                  : <a className="btn sm cta" href="/inscription" target="_blank" rel="noopener">Partager le formulaire public</a>}</div>
            ) : (
              <ul className="sub-list" aria-label="Abonnés">
                <li className="sub-row sub-head" aria-hidden="true"><span>Abonné</span><span>Source</span><span>Inscription</span><span>Statut</span><span /></li>
                {shown.map(s => (
                  <li key={s.id} className={`sub-row${s.statut !== 'Abonné' ? ' dim' : ''}`}>
                    <span className="sub-who">
                      <span className="sub-av" style={{ background: color(s.email) }} aria-hidden="true">{initials(s)}</span>
                      <span className="sub-id"><b>{s.nom || s.email.split('@')[0]}</b><a href={`mailto:${s.email}`}>{s.email}</a></span>
                    </span>
                    <span className="sub-src"><Icon name={SOURCE_ICON(s.source ?? '')} size={13} />{s.source || 'Autre'}</span>
                    <span className="sub-date"><b>{longDate(s.date_inscription)}</b><small>{relative(s.date_inscription)}</small></span>
                    <span><StatusBadge value={s.statut} label={STATUT_LABEL[s.statut] ?? s.statut} /></span>
                    <span className="sub-act"><button type="button" className="btn sm ghost nl-icon" aria-label={`Modifier ${s.email}`} title="Modifier" onClick={() => setEditing(s)}><Icon name="edit" size={16} /></button></span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
      {editing && <EditModal table="subscribers" row={editing} refs={{}} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </>
  );
}
