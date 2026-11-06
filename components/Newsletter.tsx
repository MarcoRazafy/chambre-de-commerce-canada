'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, type Row } from '@/lib/format';
import { runAction } from '@/lib/ui-actions';
import { toast } from '@/lib/toast';
import Icon from './Icon';
import ModalBackdrop from './ModalBackdrop';
import StatusBadge from './StatusBadge';
import { EditModal } from './ResourcePage';
import { useNouveau } from '@/lib/useNouveau';
import { DestinatairesFenetre, GestionEtiquettes, regleDe, resumer, useEtiquettes } from './etiquettes/Etiquettes';

type Filter = '' | 'Brouillon' | 'Programmée' | 'Envoyée';
const num = (v: unknown, d = 0) => Number(v ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: d });
const when = (v: string) => new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) + ', ' + new Date(v).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const short = (v: string) => new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' + new Date(v).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const avg = (list: Row[], k: string) => list.length ? list.reduce((a, c) => a + Number(c[k] ?? 0), 0) / list.length : 0;

// Jauge d'un taux (ouverture, clics)
function Meter({ label, value, tone }: { label: string; value: unknown; tone: 'blue' | 'green' }) {
  const v = Math.max(0, Math.min(100, Number(value ?? 0)));
  return (
    <div className="nl-meter">
      <div className="nl-meter-t"><span>{label}</span><b>{num(value, 1)} %</b></div>
      <div className="nl-meter-bar" role="progressbar" aria-label={label} aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}><span className={tone} style={{ width: `${v}%` }} /></div>
    </div>
  );
}

// Barre empilée : la part de chaque groupe (abonnés, désabonnés…), légende en texte sous la barre
export function Stack({ parts }: { parts: { label: string; n: number; cls: string }[] }) {
  const total = parts.reduce((a, p) => a + p.n, 0) || 1;
  return (
    <div className="kpi-viz">
      <div className="kpi-stack" role="img" aria-label={parts.map(p => `${p.n} ${p.label}`).join(', ')}>
        {parts.filter(p => p.n > 0).map(p => <span key={p.label} className={p.cls} style={{ flexGrow: p.n / total }} title={`${p.n} ${p.label}`} />)}
      </div>
      <div className="kpi-legend">{parts.map(p => <span key={p.label}><i className={p.cls} />{p.n} {p.label}</span>)}</div>
    </div>
  );
}

// Petites barres : le taux de chaque lettre envoyée, dans l'ordre d'envoi (la dernière est mise en avant)
function Spark({ list, k }: { list: Row[]; k: string }) {
  const max = Math.max(1, ...list.map(c => Number(c[k] ?? 0)));
  return (
    <div className="kpi-viz">
      <div className="kpi-spark" role="img" aria-label={list.map(c => `${c.titre} : ${num(c[k], 1)} %`).join(' ; ')}>
        {list.map((c, i) => (
          <span key={c.id} className={i === list.length - 1 ? 'last' : ''} title={`${c.titre} : ${num(c[k], 1)} %`}>
            <i style={{ height: `${Math.max(8, (Number(c[k] ?? 0) / max) * 100)}%` }} />
            <small>{c.date_envoi ? new Date(c.date_envoi).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '') : ''}</small>
          </span>
        ))}
      </div>
    </div>
  );
}

// Écart entre les deux dernières lettres envoyées, en points
function Delta({ list, k }: { list: Row[]; k: string }) {
  if (list.length < 2) return null;
  const d = Number(list.at(-1)![k] ?? 0) - Number(list.at(-2)![k] ?? 0);
  if (!d) return null;
  return <span className={`kpi-delta ${d > 0 ? 'up' : 'down'}`} title="Par rapport à la lettre précédente">{d > 0 ? '▲' : '▼'} {num(Math.abs(d), 1)} pt{Math.abs(d) >= 2 ? 's' : ''}</span>;
}

// Aperçu façon courriel : bandeau de la lettre, titre, début du texte
function Paper({ c, full }: { c: Row; full?: boolean }) {
  return (
    <div className={`nl-paper${full ? ' full' : ''}`}>
      <div className="nl-paper-h"><img src="/logo-app.png" alt="" width={18} height={18} /><span>La lettre CanCham</span></div>
      <div className="nl-paper-b">
        <b>{c.titre}</b>
        <p>{c.contenu || 'Pas encore de contenu.'}</p>
      </div>
    </div>
  );
}

// Page Newsletter : chiffres clés, filtres, une carte par lettre (aperçu, statut, envoi, ouverture et clics)
export default function Newsletter() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [subs, setSubs] = useState<Row[]>([]);
  const [filter, setFilter] = useState<Filter>('');
  const [term, setTerm] = useState('');
  const [editing, setEditing] = useState<Row | null>(null);
  useNouveau(() => setEditing({ statut: 'Brouillon' }));
  const [preview, setPreview] = useState<Row | null>(null);
  const [dest, setDest] = useState<Row | null>(null);
  const [gestion, setGestion] = useState(false);
  const [error, setError] = useState('');
  const { cat, load: loadCat } = useEtiquettes();

  const load = useCallback(() => Promise.all([api<Row[]>('/api/campaigns'), api<Row[]>('/api/subscribers')])
    .then(([c, s]) => { setRows(c); setSubs(s); setError(''); }).catch(e => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  async function send(c: Row) {
    // Le nombre exact de destinataires est recalculé au moment d'envoyer
    let n = '';
    try { n = String((await api<Row>('/api/audiences/apercu', 'POST', regleDe(c))).total); } catch { /* le serveur refusera s'il n'y a personne */ }
    if (!confirm(`Envoyer « ${c.titre} » maintenant à ${n || 'tous les'} destinataire${n === '1' ? '' : 's'} (${resumer(regleDe(c), cat)}) ?`)) return;
    try { toast(await runAction('campaign-send', { id: c.id })); load(); } catch (e) { setError((e as Error).message); }
  }

  const all = rows ?? [];
  const sent = all.filter(c => c.statut === 'Envoyée');
  const actifs = subs.filter(s => s.statut === 'Abonné').length;
  const count = (f: Filter) => all.filter(c => !f || c.statut === f).length;
  const shown = all.filter(c => (!filter || c.statut === filter) && (!term || [c.titre, c.contenu].join(' ').toLowerCase().includes(term.toLowerCase())));
  const chrono = [...sent].sort((a, b) => +new Date(a.date_envoi) - +new Date(b.date_envoi)).slice(-8);
  const nb = (st: string) => subs.filter(x => x.statut === st).length;
  const kpis = [
    { label: 'Abonnés actifs', value: num(actifs), icon: 'users', href: '/lettre',
      viz: <Stack parts={[{ label: 'abonnés', n: actifs, cls: 'k-a' }, { label: 'désabonnés', n: nb('Désabonné'), cls: 'k-b' }, { label: 'en échec', n: nb('Rebond'), cls: 'k-c' }]} /> },
    { label: 'Lettres', value: num(all.length), icon: 'send',
      viz: <Stack parts={[{ label: 'envoyées', n: sent.length, cls: 'k-a' }, { label: 'brouillons', n: count('Brouillon'), cls: 'k-b' }, { label: 'programmées', n: count('Programmée'), cls: 'k-c' }]} /> },
    { label: 'Ouverture moyenne', value: `${num(avg(sent, 'taux_ouverture'), 1)} %`, icon: 'mail', delta: <Delta list={chrono} k="taux_ouverture" />, viz: <Spark list={chrono} k="taux_ouverture" /> },
    { label: 'Clics moyens', value: `${num(avg(sent, 'taux_clic'), 1)} %`, icon: 'ok', delta: <Delta list={chrono} k="taux_clic" />, viz: <Spark list={chrono} k="taux_clic" /> },
  ];

  return (
    <>
      <div className="head page-tools"><div className="actions">
        <Link className="btn" href="/envois">Envois programmés</Link>
        <Link className="btn" href="/lettre">Abonnés</Link>
        <button className="btn" onClick={() => setGestion(true)} disabled={!cat}><Icon name="tag" size={16} /> Étiquettes</button>
        <button className="btn cta" onClick={() => setEditing({ statut: 'Brouillon' })}><Icon name="plus" size={16} /> Nouvelle lettre</button>
      </div></div>
      {error && <div className="err">{error}</div>}

      {rows === null ? <div className="card"><div className="skeleton"><span /><span /><span /></div></div> : (
        <>
          <div className="grid g4">
            {kpis.map(k => {
              const inner = <>
                <div className="stat-h"><span className="stat-l">{k.label}</span><span className="stat-ic tile-ic"><Icon name={k.icon} size={18} fill /></span></div>
                <div className="kpi-v"><span className="stat-v num">{k.value}</span>{k.delta}</div>
                {k.viz}
              </>;
              return k.href ? <Link key={k.label} href={k.href} className="card stat mkpi">{inner}</Link> : <div key={k.label} className="card stat mkpi">{inner}</div>;
            })}
          </div>

          <div className="dir-tools">
            <label className="search-inp dir-search"><Icon name="search" size={16} />
              <input className="inp" placeholder="Rechercher une lettre…" aria-label="Rechercher une lettre" value={term} onChange={e => setTerm(e.target.value)} /></label>
            <div className="seg" role="group" aria-label="Statut">
              {([['', 'Toutes'], ['Brouillon', 'Brouillons'], ['Programmée', 'Programmées'], ['Envoyée', 'Envoyées']] as const).map(([v, l]) =>
                <button type="button" key={v} className={filter === v ? 'on' : ''} aria-pressed={filter === v} onClick={() => setFilter(v)}>{l} · {count(v)}</button>)}
            </div>
          </div>

          {all.length === 0 ? (
            <div className="card empty-state"><span className="tile-ic"><Icon name="mail" size={18} fill /></span><b>Aucune lettre pour le moment</b>
              <button className="btn sm cta" onClick={() => setEditing({ statut: 'Brouillon' })}>Écrire la première</button></div>
          ) : shown.length === 0 ? (
            <div className="card empty-state"><b>Aucune lettre ne correspond</b><button className="btn sm" onClick={() => { setFilter(''); setTerm(''); }}>Voir toutes les lettres</button></div>
          ) : (
            <div className="nl-grid">
              {shown.map(c => {
                const isSent = c.statut === 'Envoyée';
                return (
                  <article key={c.id} className="nl-card">
                    <button type="button" className="nl-thumb-btn" onClick={() => setPreview(c)} aria-label={`Aperçu de ${c.titre}`}><Paper c={c} /></button>
                    <div className="nl-info">
                      <div className="nl-top">
                        <StatusBadge value={c.statut} label={c.statut} />
                        <span className="nl-when">{c.date_envoi ? `${isSent ? '' : 'Prévue · '}${short(c.date_envoi)}` : 'Non programmée'}</span>
                      </div>
                      <h3>{c.titre}</h3>
                      {isSent
                        ? <p className="nl-sub"><Icon name="users" size={14} />{c.destinataires ? `${num(c.destinataires)} destinataires` : `${num(actifs)} abonnés et les adhérents`}</p>
                        : <div className="nl-dest">
                          <span className="nl-dest-t"><Icon name="users" size={15} /><span><b>Destinataires</b>{resumer(regleDe(c), cat)}{c.inclure?.length && c.destinataires ? ` · ${num(c.destinataires)}` : ''}</span></span>
                          <button type="button" className="btn sm" disabled={!cat} onClick={() => setDest(c)}><Icon name="userplus" size={15} /> Choisir les destinataires</button>
                        </div>}
                      {isSent
                        ? <div className="nl-meters"><Meter label="Ouverture" value={c.taux_ouverture} tone="blue" /><Meter label="Clics" value={c.taux_clic} tone="green" /></div>
                        : <p className="nl-excerpt">{(c.contenu ?? '').replace(/^Bonjour[^\n]*\n+/i, '').split('\n').find((l: string) => l.trim()) ?? 'Pas encore de contenu.'}</p>}
                      <div className="nl-actions">
                        {!isSent && <button className="btn sm cta" onClick={() => send(c)}><Icon name="send" size={14} /> Envoyer</button>}
                        <button className="btn sm" onClick={() => setPreview(c)}>Aperçu</button>
                        <button className="btn sm ghost nl-icon" onClick={() => setEditing(c)} aria-label={`Modifier ${c.titre}`} title="Modifier"><Icon name="edit" size={16} /></button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {preview && (
        <ModalBackdrop onClose={() => setPreview(null)}>
          <div className="modal" style={{ width: 'min(100%, 640px)' }} role="dialog" aria-label={`Aperçu de ${preview.titre}`}>
            <div className="modal-h"><h2>Aperçu</h2><button type="button" className="btn sm ghost" aria-label="Fermer" onClick={() => setPreview(null)}>✕</button></div>
            <div className="modal-b"><Paper c={preview} full /></div>
          </div>
        </ModalBackdrop>
      )}
      {gestion && cat && <GestionEtiquettes cat={cat} onClose={() => setGestion(false)} onChanged={loadCat} />}
      {dest && cat && <DestinatairesFenetre titre={dest.titre} initiale={regleDe(dest)} cat={cat} onClose={() => setDest(null)}
        onSave={async r => { try { const x = await api<Row>(`/api/campaigns/${dest.id}/destinataires`, 'PUT', r); toast(`Destinataires enregistrés : ${x.total}.`); setDest(null); load(); } catch (e) { toast((e as Error).message, 'error'); } }} />}
      {editing && <EditModal table="campaigns" row={editing} refs={{}} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </>
  );
}
