'use client';
import { useNouveau } from '@/lib/useNouveau';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { RESOURCES } from '@/lib/resources';
import { api, display, imageUrl, type Row } from '@/lib/format';
import { RELATED, downloadCsv } from '@/lib/ui-actions';
import Icon from './Icon';
import { EditModal } from './ResourcePage';

const R = RESOURCES.events;
const FORMAT_CLASS: Record<string, string> = { 'Présentiel': 'f-site', 'Hybride': 'f-hybrid', 'Webinaire': 'f-web' };
const d = (v: string) => new Date(v);
const day = (v: string) => d(v).toLocaleDateString('fr-FR', { day: '2-digit' });
const month = (v: string) => d(v).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
const hour = (v: string) => d(v).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const hours = (e: Row) => hour(e.date_debut) + (e.date_fin ? ` – ${hour(e.date_fin)}` : '');
const money = (n: unknown) => `${Number(n).toLocaleString('fr-FR')} Ar`;
const price = (e: Row) => !Number(e.tarif_membre) && !Number(e.tarif_public) ? 'Gratuit'
  : !Number(e.tarif_membre) ? `Gratuit pour les membres · ${money(e.tarif_public)} public` : `${money(e.tarif_membre)} membres`;
// « Aujourd'hui », « Demain », « Dans 8 jours », « Il y a 3 jours »
// Rappels automatiques réglés sur l'événement : [libellé, date d'envoi, déjà parti]
// (envoyés par la tâche planifiée 7 jours, 1 jour et 2 heures avant le début)
function rappels(e: Row): [string, string, boolean][] {
  const debut = d(e.date_debut).getTime(), out: [string, string, boolean][] = [];
  const quand = (ms: number) => new Date(debut - ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace('.', '');
  for (const [on, l, ms] of [[e.rappel_j7, 'J−7', 7 * 864e5], [e.rappel_j1, 'J−1', 864e5], [e.rappel_h2, '2 h avant', 2 * 36e5]] as [boolean, string, number][])
    if (on) out.push([l, l === '2 h avant' ? hour(new Date(debut - ms).toISOString()) : quand(ms), Date.now() >= debut - ms]);
  return out;
}

function countdown(v: string) {
  const days = Math.round((new Date(d(v).toDateString()).getTime() - new Date(new Date().toDateString()).getTime()) / 864e5);
  return days === 0 ? 'Aujourd’hui' : days === 1 ? 'Demain' : days > 0 ? `Dans ${days} jours` : days === -1 ? 'Hier' : `Il y a ${-days} jours`;
}

// Remplissage : inscrits sur la capacité (et présents pour un événement passé)
function Fill({ e, past }: { e: Row; past: boolean }) {
  const cap = Number(e.capacite) || 0, n = Number(e.inscrits) || 0;
  const pct = cap ? Math.min(100, Math.round((n / cap) * 100)) : 0;
  return (
    <div className="ev-fill">
      <div className="ev-fill-txt">
        <span><b>{n}</b> inscrit{n > 1 ? 's' : ''}{cap ? ` sur ${cap}` : ''}</span>
        <span>{past ? `${e.presents} présent${e.presents > 1 ? 's' : ''}` : cap ? (n >= cap ? 'Complet' : `${cap - n} place${cap - n > 1 ? 's' : ''} libre${cap - n > 1 ? 's' : ''}`) : ''}</span>
      </div>
      {cap > 0 && <div className="ev-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Taux de remplissage"><span style={{ width: `${pct}%` }} className={pct >= 90 ? 'hot' : ''} /></div>}
    </div>
  );
}

// Page Événements : les cartes des événements (à venir ou passés), sur trois colonnes
export default function Evenements() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<'avenir' | 'passes' | 'tous'>('avenir');
  const [format, setFormat] = useState('');
  const [term, setTerm] = useState('');
  const [editing, setEditing] = useState<Row | null>(null);
  useNouveau(() => setEditing({}));

  const load = useCallback(() => api<Row[]>('/api/events').then(r => { setRows(r); setError(''); }).catch(e => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  const now = rows ? Date.now() : 0;   // seulement après le chargement (pas pendant le pré-rendu)
  const isPast = (e: Row) => d(e.date_fin ?? e.date_debut).getTime() < now;
  const all = rows ?? [];
  const upcoming = all.filter(e => !isPast(e)).sort((a, b) => d(a.date_debut).getTime() - d(b.date_debut).getTime());
  const past = all.filter(isPast).sort((a, b) => d(b.date_debut).getTime() - d(a.date_debut).getTime());
  const base = period === 'avenir' ? upcoming : period === 'passes' ? past : [...upcoming, ...past];
  const shown = base.filter(e => (!format || e.format === format) && (!term || [e.titre, e.lieu, e.description].join(' ').toLowerCase().includes(term.toLowerCase())));
  const cards = shown;
  const cols = R.fields.filter(f => f.list);
  const exportCsv = () => downloadCsv(R.title, cols.map(f => f.label), shown.map(e => cols.map(f => display(f, e, {}, t => RESOURCES[t].label))));

  return (
    <>
      <div className="head og-head"><div><h1>Événements</h1>
        <p className="muted">{rows ? `${upcoming.length} à venir · ${upcoming.reduce((a, e) => a + Number(e.inscrits ?? 0), 0)} inscrits · rappels automatiques aux inscrits` : 'Les rendez-vous de la chambre'}</p></div>
        <div className="actions">
        {RELATED.events?.map(([href, label]) => <Link key={href} className="btn" href={href}>{label}</Link>)}
        <button className="btn" onClick={exportCsv} disabled={!shown.length}>Exporter</button>
        <button className="btn cta" onClick={() => setEditing({})}><Icon name="plus" size={16} /> Ajouter</button>
      </div></div>
      {error && <div className="err">{error}</div>}

      {rows === null ? <div className="card"><div className="skeleton"><span /><span /><span /></div></div> : (
        <>
          <div className="dir-tools">
            <label className="search-inp dir-search"><Icon name="search" size={16} />
              <input className="inp" placeholder="Rechercher un événement, un lieu…" aria-label="Rechercher un événement" value={term} onChange={e => setTerm(e.target.value)} /></label>
            <div className="seg" role="group" aria-label="Période">
              {([['avenir', `À venir · ${upcoming.length}`], ['passes', `Passés · ${past.length}`], ['tous', 'Tous']] as const).map(([v, l]) =>
                <button type="button" key={v} className={period === v ? 'on' : ''} aria-pressed={period === v} onClick={() => setPeriod(v)}>{l}</button>)}
            </div>
            <select className="inp dir-sector" aria-label="Format" value={format} onChange={e => setFormat(e.target.value)}>
              <option value="">Tous les formats</option>
              {['Présentiel', 'Hybride', 'Webinaire'].map(f => <option key={f}>{f}</option>)}
            </select>
          </div>

          {all.length === 0 ? (
            <div className="card empty-state"><span className="tile-ic"><Icon name="cal" size={18} fill /></span><b>Aucun événement pour le moment</b>
              <button className="btn sm cta" onClick={() => setEditing({})}>Créer le premier</button></div>
          ) : cards.length === 0 ? (
            <div className="card empty-state"><b>Aucun événement ne correspond</b>
              <button className="btn sm" onClick={() => { setTerm(''); setFormat(''); setPeriod('tous'); }}>Voir tous les événements</button></div>
          ) : (
            <div className="ev-grid">
              {cards.map(e => {
                const done = isPast(e);
                return (
                  <Link key={e.id} href={`/evenements/${e.id}`} className={`ev-card${done ? ' past' : ''}`}>
                    <div className="ev-card-cover">
                      {imageUrl(e.couverture_url) ? <img src={imageUrl(e.couverture_url)!} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span className="ev-cover-empty"><Icon name="cal" size={28} /></span>}
                      <span className="ev-date"><b>{day(e.date_debut)}</b><small>{month(e.date_debut)}</small></span>
                      <span className={`ev-format on-img ${FORMAT_CLASS[e.format] ?? ''}`}>{e.format}</span>
                      {done && <span className="ev-done">Terminé</span>}
                    </div>
                    <div className="ev-card-body">
                      <span className="ev-when">{countdown(e.date_debut)} · {hours(e)}</span>
                      <h3>{e.titre}</h3>
                      <ul className="ev-facts sm">
                        {e.lieu && <li><span className="tile-ic xxs"><Icon name="pin" size={12} fill /></span>{e.lieu}</li>}
                        <li><span className="tile-ic xxs"><Icon name="coin" size={12} fill /></span>{price(e)}</li>
                      </ul>
                    </div>
                    {!done && (e.rappel_j7 || e.rappel_j1 || e.rappel_h2) && (
                      <div className="ev-rappels"><span className="eyebrow">Rappels automatiques</span>
                        <span className="ev-rappels-l">{rappels(e).map(([l, d, parti]) => <span key={l} className={`ev-rap${parti ? ' sent' : ''}`}>{l}{parti ? ' envoyé' : ` · ${d}`}</span>)}</span></div>
                    )}
                    <div className="ev-card-foot"><Fill e={e} past={done} /></div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
      {editing && <EditModal table="events" row={editing} refs={{}} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </>
  );
}
