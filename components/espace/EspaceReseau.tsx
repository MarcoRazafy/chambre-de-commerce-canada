'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Row } from '@/lib/format';
import { toast } from '@/lib/toast';
import Avatar from '../Avatar';
import Icon from '../Icon';
import { Pager, usePage } from '../Pagination';
import { appel, jour } from './api';
import { useMoi } from './EspaceShell';

const lieu = (m: Row) => [m.ville, m.pays === 'CA' ? 'Canada' : 'Madagascar'].filter(Boolean).join(', ');
const lien = (u?: string) => (u ? (/^https?:\/\//.test(u) ? u : `https://${u}`) : '');

// Annuaire des membres : recherche, secteur, fiches dépliables
export function EspaceAnnuaire() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [term, setTerm] = useState('');
  const [secteur, setSecteur] = useState('');
  const [ouvert, setOuvert] = useState<number | null>(null);
  useEffect(() => { appel<Row[]>('/api/espace/annuaire').then(setRows).catch(e => toast(e.message, 'error')); }, []);
  const secteurs = [...new Set((rows ?? []).map(m => m.secteur).filter(Boolean))].sort();
  const shown = (rows ?? []).filter(m => (!secteur || m.secteur === secteur) &&
    (!term || [m.nom, m.ville, m.activite, m.description, ...(m.offres ?? [])].join(' ').toLowerCase().includes(term.toLowerCase())));
  const pg = usePage(shown, [term, secteur]);
  return (
    <>
      <div className="head"><div><h1>Annuaire des membres</h1><p className="muted">Les entreprises membres de la Chambre. Pour être présenté à l’une d’elles, écrivez à la Chambre.</p></div></div>
      <div className="filters">
        <label className="search-inp"><Icon name="search" size={16} /><input className="inp" placeholder="Nom, ville, activité…" aria-label="Rechercher un membre" value={term} onChange={e => setTerm(e.target.value)} /></label>
        <select className="inp" style={{ flex: '0 1 260px' }} aria-label="Secteur" value={secteur} onChange={e => setSecteur(e.target.value)}>
          <option value="">Tous les secteurs</option>{secteurs.map(s => <option key={s}>{s}</option>)}</select>
        <span className="small muted">{shown.length} membre{shown.length > 1 ? 's' : ''}</span>
      </div>
      {rows === null ? <div className="card"><div className="skeleton"><span /><span /><span /></div></div> : (
        <>
          <div className="es-cartes">
            {pg.items.map(m => (
              <article key={m.id} className="card es-carte">
                <div className="row" style={{ flexWrap: 'nowrap' }}><Avatar kind="member" id={m.id} size={48} nom={m.nom} />
                  <div className="grow"><span className="eyebrow es-sect">{m.secteur ?? 'Membre'}</span><b className="es-nom">{m.nom}</b><small className="muted">{lieu(m)}</small></div></div>
                {m.activite && <p className="small">{m.activite}</p>}
                {ouvert === m.id && <>
                  {m.description && <p className="small muted es-desc">{m.description}</p>}
                  {m.offres?.length > 0 && <div className="es-chips"><small className="eyebrow">Propose</small>{m.offres.map((o: string) => <span key={o} className="pchip info">{o}</span>)}</div>}
                  {m.besoins?.length > 0 && <div className="es-chips"><small className="eyebrow">Recherche</small>{m.besoins.map((o: string) => <span key={o} className="pchip off">{o}</span>)}</div>}
                  {m.site_web && <a className="small" href={lien(m.site_web)} target="_blank" rel="noopener noreferrer">{m.site_web.replace(/^https?:\/\//, '')}</a>}
                </>}
                <button type="button" className="btn sm ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setOuvert(ouvert === m.id ? null : m.id)}>{ouvert === m.id ? 'Moins' : 'En savoir plus'}</button>
              </article>
            ))}
          </div>
          <Pager p={pg} quoi="membres" />
        </>
      )}
    </>
  );
}

// Mises en relation faites par la Chambre pour l'entreprise
export function EspaceRelations() {
  const { moi } = useMoi();
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => { appel<Row[]>('/api/espace/relations').then(setRows).catch(e => toast(e.message, 'error')); }, []);
  return (
    <>
      <div className="head"><div><h1>Mises en relation</h1><p className="muted">Les entreprises que la Chambre vous a présentées, parce que l’une a besoin de ce que l’autre propose.</p></div></div>
      {rows === null ? <div className="card"><div className="skeleton"><span /><span /></div></div>
        : rows.length === 0 ? (
          <div className="card empty-state"><span className="tile-ic"><Icon name="spark" size={18} fill /></span><b>Pas encore de mise en relation</b>
            <span className="small muted">La Chambre vous présentera des partenaires à partir de votre questionnaire de maillage.</span>
            {moi && moi.maillage.pct < 100 && <Link className="btn sm cta" href="/espace/maillage">Compléter mon questionnaire ({moi.maillage.faites}/{moi.maillage.total})</Link>}</div>
        ) : (
          <div className="es-cartes">
            {rows.map(r => (
              <article key={r.id} className="card es-carte">
                <div className="row" style={{ flexWrap: 'nowrap' }}><Avatar kind="member" id={r.membre_id} size={48} nom={r.nom} />
                  <div className="grow"><span className="eyebrow es-sect">{r.secteur ?? 'Membre'}</span><b className="es-nom">{r.nom}</b><small className="muted">{lieu(r)} · présenté le {jour(r.created_at)}</small></div></div>
                {r.note && <p className="small es-note">{r.note}</p>}
                {r.activite && <p className="small muted">{r.activite}</p>}
                {r.contact && <div className="es-contact small"><b>{r.contact.nom}</b>{r.contact.fonction && <span className="muted"> · {r.contact.fonction}</span>}
                  {r.contact.email && <a href={`mailto:${r.contact.email}`}><Icon name="mail" size={13} /> {r.contact.email}</a>}
                  {r.contact.tel && <a href={`tel:${r.contact.tel}`}><Icon name="chat" size={13} /> {r.contact.tel}</a>}</div>}
              </article>
            ))}
          </div>
        )}
    </>
  );
}
