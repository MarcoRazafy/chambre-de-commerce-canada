'use client';
import { useCallback, useEffect, useState } from 'react';
import { Pager, usePage } from './Pagination';
import { api, type Row } from '@/lib/format';
import Icon from './Icon';
import ModalBackdrop from './ModalBackdrop';
import { EditModal } from './ResourcePage';
import { useNouveau } from '@/lib/useNouveau';
import { GestionEtiquettes, REGLE_DEFAUT, regleDe, resumer, useEtiquettes } from './etiquettes/Etiquettes';
import NouvelleLettre from './NouvelleLettre';

type Filter = '' | 'Brouillon' | 'Programmée' | 'Envoyée';
const num = (v: unknown, d = 0) => Number(v ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: d });
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

// Écart entre les deux dernières lettres envoyées : « +4,1 pts par rapport à la précédente »
function ecart(list: Row[], k: string) {
  if (list.length < 2) return list.length ? 'sur la dernière lettre' : 'aucune lettre envoyée';
  const d = Number(list.at(-1)![k] ?? 0) - Number(list.at(-2)![k] ?? 0);
  return `${d >= 0 ? '+' : '−'}${num(Math.abs(d), 1)} pt${Math.abs(d) >= 2 ? 's' : ''} sur la dernière`;
}
const CHIP: Record<string, string> = { 'Envoyée': 'ok', 'Programmée': 'info', 'Brouillon': 'off' };
const shortDate = (v: string) => new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

// Page Newsletter (maquette « Propositions UX ») : 4 chiffres clés, puis le tableau des lettres.
// « Nouvelle newsletter » et « Continuer » ouvrent le panneau en 3 étapes : Contenu, Destinataires, Envoi.
export default function Newsletter() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [audience, setAudience] = useState<Row | null>(null);
  const [filter, setFilter] = useState<Filter>('');
  const [term, setTerm] = useState('');
  const [ouverte, setOuverte] = useState<Row | null>(null);
  useNouveau(() => setOuverte({ statut: 'Brouillon' }));
  const [preview, setPreview] = useState<Row | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [gestion, setGestion] = useState(false);
  const [error, setError] = useState('');
  const { cat, load: loadCat } = useEtiquettes();

  const load = useCallback(() => Promise.all([api<Row[]>('/api/campaigns'), api<Row>('/api/audiences/apercu', 'POST', REGLE_DEFAUT)])
    .then(([c, a]) => { setRows(c); setAudience(a); setError(''); }).catch(e => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const all = rows ?? [];
  const sent = all.filter(c => c.statut === 'Envoyée');
  const count = (f: Filter) => all.filter(c => !f || c.statut === f).length;
  const shown = all.filter(c => (!filter || c.statut === filter) && (!term || [c.titre, c.contenu].join(' ').toLowerCase().includes(term.toLowerCase())));
  const pg = usePage(shown, [filter, term]);
  const chrono = [...sent].sort((a, b) => +new Date(a.date_envoi) - +new Date(b.date_envoi));
  const kpis: [string, string, string][] = [
    ['Audience', num(audience?.total), audience ? `${num(audience.membres)} contacts adhérents + ${num(audience.abonnes)} abonnés` : '…'],
    ['Ouverture moyenne', `${num(avg(sent, 'taux_ouverture'), 1)} %`, ecart(chrono, 'taux_ouverture')],
    ['Clics moyens', `${num(avg(sent, 'taux_clic'), 1)} %`, ecart(chrono, 'taux_clic')],
    ['Programmées', num(count('Programmée')), `${count('Brouillon')} brouillon${count('Brouillon') > 1 ? 's' : ''}`],
  ];

  return (
    <>
      <div className="head page-tools"><div className="actions">
        <button className="btn" onClick={() => setGestion(true)} disabled={!cat}><Icon name="tag" size={16} /> Étiquettes</button>
        <button className="btn cta" onClick={() => setOuverte({ statut: 'Brouillon' })}><Icon name="plus" size={16} /> Nouvelle newsletter</button>
      </div></div>
      {error && <div className="err">{error}</div>}

      {rows === null ? <div className="card"><div className="skeleton"><span /><span /><span /></div></div> : (
        <>
          <div className="grid g4">
            {kpis.map(([l, v, d]) => <div key={l} className="card kpi4 static"><span className="eyebrow">{l}</span><span className="kpi4-v num">{v}</span><span className="small muted">{d}</span></div>)}
          </div>

          <section className="card mtbl-card">
            {all.length > 0 && <div className="filters">
              <label className="search-inp"><Icon name="search" size={16} />
                <input className="inp" placeholder="Rechercher une lettre…" aria-label="Rechercher une lettre" value={term} onChange={e => setTerm(e.target.value)} /></label>
              <select className="inp" style={{ flex: '0 1 220px' }} aria-label="Statut" value={filter} onChange={e => setFilter(e.target.value as Filter)}>
                {([['', 'Toutes les lettres'], ['Brouillon', 'Brouillons'], ['Programmée', 'Programmées'], ['Envoyée', 'Envoyées']] as const).map(([v, l]) => <option key={v} value={v}>{l} · {count(v)}</option>)}
              </select>
            </div>}
            {all.length === 0 ? (
              <div className="empty-state"><span className="tile-ic"><Icon name="mail" size={18} fill /></span><b>Aucune lettre pour le moment</b>
                <button className="btn sm cta" onClick={() => setOuverte({ statut: 'Brouillon' })}>Écrire la première</button></div>
            ) : shown.length === 0 ? (
              <div className="empty-state"><b>Aucune lettre ne correspond</b><button className="btn sm" onClick={() => { setFilter(''); setTerm(''); }}>Voir toutes les lettres</button></div>
            ) : (
              <div className="tbl">
                <table className="mtbl nl-table">
                  <thead><tr><th>Newsletter</th><th>Statut</th><th>Envoi</th><th className="r">Ouverture</th><th className="r">Clics</th><th /></tr></thead>
                  <tbody>
                    {pg.items.map(c => {
                      const isSent = c.statut === 'Envoyée';
                      return (
                        <tr key={c.id} className="click" onClick={() => (isSent ? setPreview(c) : setOuverte(c))}>
                          <td><b className="nl-t">{c.titre}</b>
                            <span className="inv-sub nl-qui" title={isSent ? undefined : resumer(regleDe(c), cat)}>{isSent ? (c.destinataires ? `${num(c.destinataires)} destinataires` : 'Adhérents et abonnés') : resumer(regleDe(c), cat)}</span></td>
                          <td><span className={`pchip ${CHIP[c.statut] ?? ''}`}>{c.statut === 'Envoyée' ? '✓ Envoyée' : c.statut}</span></td>
                          <td className="small">{c.date_envoi ? <>{c.statut === 'Programmée' && 'prévue le '}{shortDate(c.date_envoi)}</> : '—'}</td>
                          <td className="r num">{isSent ? `${num(c.taux_ouverture, 1)} %` : '—'}</td>
                          <td className="r num">{isSent ? `${num(c.taux_clic, 1)} %` : '—'}</td>
                          <td className="r" onClick={e => e.stopPropagation()}>
                            <span className="inv-btns">
                              {isSent
                                ? <button type="button" className="btn sm" onClick={() => setPreview(c)}><Icon name="eye" size={14} /> Aperçu</button>
                                : <button type="button" className="btn sm" onClick={() => setOuverte(c)}>Continuer ›</button>}
                              <button type="button" className="btn sm ghost nl-icon" onClick={() => setEditing(c)} aria-label={`Modifier ${c.titre}`} title="Modifier tous les champs"><Icon name="edit" size={15} /></button>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <Pager p={pg} quoi="lettres" />
          </section>
        </>
      )}

      {preview && (
        <ModalBackdrop onClose={() => setPreview(null)}>
          <div className="modal" style={{ width: 'min(100%, 640px)' }} role="dialog" aria-label={`Aperçu de ${preview.titre}`}>
            <div className="modal-h"><h2>Aperçu</h2><button type="button" className="btn sm ghost" aria-label="Fermer" onClick={() => setPreview(null)}>✕</button></div>
            <div className="modal-b"><Paper c={preview} full />
              {preview.statut === 'Envoyée' && <div className="nl-meters"><Meter label="Ouverture" value={preview.taux_ouverture} tone="blue" /><Meter label="Clics" value={preview.taux_clic} tone="green" /></div>}</div>
          </div>
        </ModalBackdrop>
      )}
      {ouverte && <NouvelleLettre key={ouverte.id ?? 'nouvelle'} lettre={ouverte} onClose={() => { setOuverte(null); load(); }} onDone={() => { setOuverte(null); load(); }} />}
      {gestion && cat && <GestionEtiquettes cat={cat} onClose={() => setGestion(false)} onChanged={loadCat} />}
      {editing && <EditModal table="campaigns" row={editing} refs={{}} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </>
  );
}
