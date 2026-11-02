'use client';
import Link from 'next/link';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { RESOURCES } from '@/lib/resources';
import { api, display, type Row } from '@/lib/format';
import ResourcePage, { EditModal } from '../ResourcePage';

const R = RESOURCES.events;

// Fiche événement : informations + liste des inscrits (qui reçoivent les rappels automatiques)
export default function EventDetail({ id }: { id: number }) {
  const [e, setE] = useState<Row | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [v, setV] = useState(0);

  const load = useCallback(() => {
    api<Row>(`/api/events/${id}`).then(x => { setE(x); setV(n => n + 1); }).catch(err => setError(err.message));
  }, [id]);
  useEffect(load, [load]);

  if (!e) return error ? <div className="err">{error}</div> : <div className="empty">Chargement…</div>;
  const rappels = [e.rappel_j7 && '7 jours avant', e.rappel_j1 && 'la veille', e.rappel_h2 && '2 heures avant'].filter(Boolean);
  return (
    <>
      <div className="head">
        <div><div className="eyebrow"><Link href="/evenements">Événements</Link></div><h1><em>{e.titre}</em></h1>
          <p className="muted">{display(R.fields[1], e, {}, () => '')} · {e.format}{e.lieu ? ' · ' + e.lieu : ''}</p></div>
        <div className="actions"><button className="btn cta" onClick={() => setEditing(true)}>Modifier</button></div>
      </div>
      <div className="grid g4">
        <div className="card tight"><span className="muted small">Inscrits</span><b className="num" style={{ fontSize: '1.6rem' }}>{e.inscrits}{e.capacite ? ` / ${e.capacite}` : ''}</b></div>
        <div className="card tight"><span className="muted small">Présents</span><b className="num" style={{ fontSize: '1.6rem' }}>{e.presents}</b></div>
        <div className="card tight"><span className="muted small">Tarifs</span><b>{display(R.fields.find(f => f.name === 'tarif_membre')!, e, {}, () => '')} / {display(R.fields.find(f => f.name === 'tarif_public')!, e, {}, () => '')}</b><span className="small muted">membre / public</span></div>
        <div className="card tight"><span className="muted small">Rappels automatiques</span><b>{rappels.length ? rappels.join(', ') : 'Aucun'}</b></div>
      </div>
      <div className="card">
        <dl className="kv">{R.fields.filter(f => ['diffusion', 'lieu'].includes(f.name)).map(f => <Fragment key={f.name}><dt>{f.label}</dt><dd>{display(f, e, {}, () => '')}</dd></Fragment>)}</dl>
      </div>
      <ResourcePage key={v} table="event_registrations" bare preset={{ event_id: id }} />
      {editing && <EditModal table="events" row={e} refs={{}} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />}
    </>
  );
}
