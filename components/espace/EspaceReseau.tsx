'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Row } from '@/lib/format';
import { toast } from '@/lib/toast';
import Avatar from '../Avatar';
import Icon from '../Icon';
import { appel, jour } from './api';
import { useMoi } from './EspaceShell';

const lieu = (m: Row) => [m.ville, m.pays === 'CA' ? 'Canada' : 'Madagascar'].filter(Boolean).join(', ');
const lien = (u?: string) => (u ? (/^https?:\/\//.test(u) ? u : `https://${u}`) : '');

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
