'use client';
import { useCallback, useEffect, useState } from 'react';
import { RESOURCES } from '@/lib/resources';
import { api, relative, type Row } from '@/lib/format';
import { downloadCsv } from '@/lib/ui-actions';
import Avatar from './Avatar';
import Icon from './Icon';
import { EditModal } from './ResourcePage';

const R = RESOURCES.team_users;
type Filter = '' | 'Administrateur' | 'Manager' | 'inactif' | 'jamais';

// Page Équipe & accès : une carte par compte (photo, fonction, rôle, état, dernière connexion), filtres et chiffres clés
export default function Equipe() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState<Filter>('');
  const [term, setTerm] = useState('');
  const [editing, setEditing] = useState<Row | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => api<Row[]>('/api/team_users').then(r => { setRows(r); setError(''); }).catch(e => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const all = rows ?? [];
  const match = (u: Row, f: Filter) => !f || (f === 'inactif' ? !u.actif : f === 'jamais' ? u.actif && !u.derniere_connexion : u.role === f);
  const count = (f: Filter) => all.filter(u => match(u, f)).length;
  const shown = all.filter(u => match(u, filter) && (!term || [u.nom, u.email, u.fonction].join(' ').toLowerCase().includes(term.toLowerCase())))
    .sort((a, b) => (b.actif - a.actif) || String(b.derniere_connexion ?? '').localeCompare(String(a.derniere_connexion ?? '')) || a.nom.localeCompare(b.nom, 'fr'));
  const cols = R.fields.filter(f => f.list);
  const exportCsv = () => downloadCsv(R.title, cols.map(f => f.label), shown.map(u => cols.map(f => String(u[f.name] ?? ''))));
  const kpis: [Filter, string, string, string][] = [
    ['Administrateur', 'Administrateurs', 'team', 'tous les droits, dont l’équipe'],
    ['Manager', 'Managers', 'users', 'gestion courante'],
    ['jamais', 'Jamais connectés', 'clock', 'comptes actifs jamais utilisés'],
    ['inactif', 'Désactivés', 'minus', 'sans accès, non facturés'],
  ];

  return (
    <>
      <div className="head page-tools"><div className="actions">
        <button className="btn" onClick={exportCsv} disabled={!shown.length}>Exporter</button>
        <button className="btn cta" onClick={() => setEditing({ role: 'Manager', actif: true })}><Icon name="userplus" size={16} /> Inviter un membre de l’équipe</button>
      </div></div>
      {error && <div className="err">{error}</div>}

      {rows === null ? <div className="card"><div className="skeleton"><span /><span /><span /></div></div> : (
        <>
          <div className="grid g4">
            {kpis.map(([f, label, icon, sub]) => (
              <button key={f} type="button" className={`card stat mkpi pay-kpi${filter === f ? ' sel' : ''}`} aria-pressed={filter === f} onClick={() => setFilter(filter === f ? '' : f)}>
                <div className="stat-h"><span className="stat-l">{label}</span><span className="stat-ic tile-ic"><Icon name={icon} size={18} fill /></span></div>
                <div className="kpi-v"><span className="stat-v num">{count(f)}</span></div>
                <span className="stat-s">{sub}</span>
              </button>
            ))}
          </div>

          <div className="dir-tools">
            <label className="search-inp dir-search"><Icon name="search" size={16} />
              <input className="inp" placeholder="Rechercher un nom, un courriel, une fonction…" aria-label="Rechercher dans l’équipe" value={term} onChange={e => setTerm(e.target.value)} /></label>
            <div className="seg" role="group" aria-label="Filtre">
              {([['', 'Tous'], ['Administrateur', 'Admins'], ['Manager', 'Managers'], ['inactif', 'Désactivés']] as const).map(([v, l]) =>
                <button type="button" key={v} className={filter === v ? 'on' : ''} aria-pressed={filter === v} onClick={() => setFilter(v)}>{l} · {count(v)}</button>)}
            </div>
            <span className="small muted dir-count">{shown.length} compte{shown.length > 1 ? 's' : ''}</span>
          </div>

          {shown.length === 0 ? (
            <div className="card empty-state"><b>Aucun compte ne correspond</b><button className="btn sm" onClick={() => { setFilter(''); setTerm(''); }}>Voir toute l’équipe</button></div>
          ) : (
            <div className="team-grid">
              {shown.map(u => {
                const seen = u.derniere_connexion ? relative(u.derniere_connexion) : null;
                const online = u.derniere_connexion && Date.now() - new Date(u.derniere_connexion).getTime() < 15 * 60e3;
                return (
                  <article key={u.id} className={`team-card${u.actif ? '' : ' off'}`}>
                    <div className="team-top">
                      <span className="team-av"><Avatar kind="user" id={u.id} size={64} nom={u.nom} />{online && <i className="team-online" title="En ligne" />}</span>
                      <button type="button" className="btn sm ghost nl-icon" aria-label={`Modifier ${u.nom}`} title="Modifier" onClick={() => setEditing(u)}><Icon name="edit" size={16} /></button>
                    </div>
                    <div className="team-id">
                      <b>{u.nom}</b>
                      <span>{u.fonction || '—'}</span>
                    </div>
                    <div className="team-tags">
                      <span className={`sub-role${u.role === 'Administrateur' ? ' admin' : ''}`}>{u.role}</span>
                      <span className={`state${u.actif ? ' on' : ''}`}>{u.actif ? 'Actif' : 'Désactivé'}</span>
                    </div>
                    <div className="team-foot">
                      <a href={`mailto:${u.email}`} title={u.email}><Icon name="mail" size={14} />{u.email}</a>
                      <span className={seen ? '' : 'never'}><Icon name="clock" size={14} />{seen ? `Vu ${seen}` : 'Jamais connecté'}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
      {editing && <EditModal table="team_users" row={editing} refs={{}} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </>
  );
}
