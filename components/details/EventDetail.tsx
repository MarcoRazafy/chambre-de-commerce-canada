'use client';
import { useCallback, useEffect, useState } from 'react';
import { RESOURCES } from '@/lib/resources';
import { api, display, imageUrl, type Row } from '@/lib/format';
import Icon from '../Icon';
import ResourcePage, { EditModal } from '../ResourcePage';

const R = RESOURCES.events;
const field = (name: string) => R.fields.find(f => f.name === name)!;
const lines = (t: string | null) => (t ?? '').split('\n').map(l => l.trim()).filter(Boolean);

// « 09:00 Accueil », « 9h30 - Ouverture » → heure + étape ; une ligne sans heure reste une étape simple
const steps = (t: string | null) => lines(t).map(l => {
  const m = l.match(/^(\d{1,2}\s*[:h]\s*\d{2})\s*[-–—:]?\s*(.+)$/i);
  return m ? { heure: m[1].replace(/\s/g, '').replace('h', ':').padStart(5, '0'), texte: m[2] } : { heure: '', texte: l };
});
// « Nom — fonction » (tiret long, court ou virgule)
const people = (t: string | null) => lines(t).map(l => {
  const [nom, ...rest] = l.split(/\s+[—–-]\s+|,\s+/);
  return { nom, fonction: rest.join(', ') };
});

const day = (v: string) => new Date(v).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const hour = (v: string) => new Date(v).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const sameDay = (a: string, b: string) => new Date(a).toDateString() === new Date(b).toDateString();

// Fichier .ics pour l'ajouter à Google Agenda, Outlook ou au téléphone (fin par défaut : 2 heures après le début)
function downloadIcs(e: Row) {
  const stamp = (v: string | Date) => new Date(v).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = (s: string) => s.replace(/[\\,;]/g, m => '\\' + m).replace(/\n/g, '\\n');
  const fin = e.date_fin ?? new Date(new Date(e.date_debut).getTime() + 2 * 3600_000);
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//L’Alliée Virtuelle//FR', 'BEGIN:VEVENT',
    `UID:event-${e.id}@allieevirtuelle`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(e.date_debut)}`, `DTEND:${stamp(fin)}`,
    `SUMMARY:${esc(e.titre)}`, e.lieu && `LOCATION:${esc(e.lieu)}`, e.description && `DESCRIPTION:${esc(e.description)}`,
    imageUrl(e.lien_visio) && `URL:${e.lien_visio}`, 'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = 'evenement.ics';
  a.click();
  URL.revokeObjectURL(a.href);
}

// Fiche événement : couverture, présentation, déroulement, intervenants, informations pratiques et inscrits
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
  const cover = imageUrl(e.couverture_url), visio = imageUrl(e.lien_visio);
  const horaire = e.date_fin
    ? sameDay(e.date_debut, e.date_fin) ? `${hour(e.date_debut)} – ${hour(e.date_fin)}` : `jusqu’au ${day(e.date_fin)}, ${hour(e.date_fin)}`
    : hour(e.date_debut);
  const enSalle = e.format !== 'Webinaire' && e.lieu;
  const prog = steps(e.deroulement), intervenants = people(e.intervenants);
  const plein = e.capacite ? Math.min(100, Math.round((e.inscrits / e.capacite) * 100)) : null;
  const start = new Date(e.date_debut);

  return (
    <>
      <div className="card ev-hero">
        <div className="ev-cover">{cover ? <img src={cover} alt="" referrerPolicy="no-referrer" /> : <Icon name="cal" size={40} />}</div>
        <div className="ev-hero-b">
          <div className="dt ev-dt">
            <span>{start.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</span>
            <b>{start.getDate()}</b>
          </div>
          <div className="grow">
            <span className="pill">{e.format}</span>
            <h1>{e.titre}</h1>
            <p className="muted"><span className="first-up">{day(e.date_debut)}</span>, {horaire}{e.lieu ? ` · ${e.lieu}` : ''}</p>
          </div>
          <div className="actions">
            <button className="btn" onClick={() => downloadIcs(e)}><Icon name="cal" size={16} /> Ajouter à mon agenda</button>
            <button className="btn cta" onClick={() => setEditing(true)}><Icon name="edit" size={16} /> Modifier</button>
          </div>
        </div>
      </div>

      <div className="grid g21">
        <div className="col">
          <div className="card">
            <h2>Présentation</h2>
            {e.description ? <p className="prose">{e.description}</p> : <p className="muted small">Pas encore de présentation : ajoutez-la avec « Modifier ».</p>}
          </div>
          <div className="card">
            <h2>Déroulement</h2>
            {prog.length ? (
              <ol className="ev-prog">
                {prog.map((s, i) => <li key={i}><time>{s.heure}</time><span>{s.texte}</span></li>)}
              </ol>
            ) : <p className="muted small">Le programme n’est pas encore renseigné.</p>}
          </div>
          {intervenants.length > 0 && (
            <div className="card">
              <h2>Intervenants</h2>
              <ul className="ev-people">
                {intervenants.map((p, i) => (
                  <li key={i}>
                    <span className="ev-ini">{p.nom.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()}</span>
                    <div><b>{p.nom}</b>{p.fonction && <span className="small muted">{p.fonction}</span>}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="col">
          <div className="card ev-info">
            <div className="ev-row"><span className="tile-ic"><Icon name="cal" size={18} fill /></span>
              <div><span className="small muted">Quand</span><b className="first-up">{day(e.date_debut)}</b><span>{horaire}</span></div></div>
            <div className="ev-row"><span className="tile-ic"><Icon name="pin" size={18} fill /></span>
              <div><span className="small muted">Où</span><b>{e.lieu || (e.format === 'Webinaire' ? 'En ligne' : 'Lieu à préciser')}</b>
                {enSalle && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.lieu)}`} target="_blank" rel="noopener noreferrer">Voir sur la carte</a>}
                {visio && <a href={visio} target="_blank" rel="noopener noreferrer">Lien de connexion</a>}</div></div>
            <div className="ev-row"><span className="tile-ic"><Icon name="users" size={18} fill /></span>
              <div><span className="small muted">Places</span><b>{e.inscrits} inscrit{e.inscrits > 1 ? 's' : ''}{e.capacite ? ` sur ${e.capacite}` : ''}</b>
                {plein !== null && <div className="bar" aria-label={`${plein} % des places prises`}><i style={{ width: `${plein}%` }} /></div>}
                <span className="small muted">{e.presents} présent{e.presents > 1 ? 's' : ''}</span></div></div>
            <div className="ev-row"><span className="tile-ic"><Icon name="coin" size={18} fill /></span>
              <div><span className="small muted">Tarifs</span><b>Membre : {display(field('tarif_membre'), e, {}, () => '') === '—' ? 'gratuit' : display(field('tarif_membre'), e, {}, () => '') + ' Ar'}</b>
                <span>Public : {display(field('tarif_public'), e, {}, () => '') === '—' ? 'gratuit' : display(field('tarif_public'), e, {}, () => '') + ' Ar'}</span></div></div>
            <div className="ev-row"><span className="tile-ic"><Icon name="bell" size={18} fill /></span>
              <div><span className="small muted">Rappels automatiques</span><b>{rappels.length ? rappels.join(', ') : 'Aucun'}</b>
                <span className="small muted">{e.diffusion}</span></div></div>
          </div>
        </div>
      </div>

      <ResourcePage key={v} table="event_registrations" bare preset={{ event_id: id }} />
      {editing && <EditModal table="events" row={e} refs={{}} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />}
    </>
  );
}
