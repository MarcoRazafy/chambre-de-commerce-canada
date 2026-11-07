'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { imageUrl, type Row } from '@/lib/format';
import { toast } from '@/lib/toast';
import Icon from '../Icon';
import { day, downloadIcs, hour, people, sameDay, steps } from '../details/EventDetail';
import { appel } from './api';

const ar = (n: unknown) => (Number(n) ? `${Number(n).toLocaleString('fr-FR')} Ar` : 'gratuit');

// Fiche d'un événement dans l'espace membre : même présentation que pour l'équipe, avec l'inscription
export default function EspaceEvenement() {
  const { id } = useParams<{ id: string }>();
  const [e, setE] = useState<Row | null>(null);
  const [erreur, setErreur] = useState('');
  const [busy, setBusy] = useState(false);
  const charger = useCallback(() => appel<Row>(`/api/espace/evenements/${id}`).then(setE).catch(x => setErreur(x.message)), [id]);
  useEffect(() => { charger(); }, [charger]);
  async function basculer() {
    if (!e) return;
    if (e.inscrit && !confirm(`Annuler votre inscription à « ${e.titre} » ?`)) return;
    setBusy(true);
    try { await appel(`/api/espace/evenements/${e.id}`, e.inscrit ? 'DELETE' : 'POST'); toast(e.inscrit ? 'Inscription annulée.' : 'Vous êtes inscrit. À bientôt !'); charger(); }
    catch (x) { toast((x as Error).message, 'error'); } finally { setBusy(false); }
  }
  if (!e) return erreur ? <div className="err">{erreur}</div> : <div className="card"><div className="skeleton"><span /><span /><span /></div></div>;
  const cover = imageUrl(e.couverture_url), visio = imageUrl(e.lien_visio);
  const horaire = e.date_fin ? sameDay(e.date_debut, e.date_fin) ? `${hour(e.date_debut)} – ${hour(e.date_fin)}` : `jusqu’au ${day(e.date_fin)}, ${hour(e.date_fin)}` : hour(e.date_debut);
  const prog = steps(e.deroulement), intervenants = people(e.intervenants);
  const plein = e.capacite ? Math.min(100, Math.round((e.inscrits / e.capacite) * 100)) : null;
  const complet = e.capacite && e.inscrits >= e.capacite;
  const passe = new Date(e.date_fin ?? e.date_debut).getTime() < Date.now();
  const start = new Date(e.date_debut);
  return (
    <>
      <div className="card ev-hero">
        <div className="ev-cover">{cover ? <img src={cover} alt="" referrerPolicy="no-referrer" /> : <Icon name="cal" size={40} />}</div>
        <div className="ev-hero-b">
          <div className="dt ev-dt"><span>{start.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</span><b>{start.getDate()}</b></div>
          <div className="grow">
            <span className="pill">{e.format}</span>
            <h1>{e.titre}</h1>
            <p className="muted"><span className="first-up">{day(e.date_debut)}</span>, {horaire}{e.lieu ? ` · ${e.lieu}` : ''}</p>
          </div>
          <div className="actions">
            <Link className="btn" href="/espace/evenements">‹ Événements</Link>
            <button className="btn" onClick={() => downloadIcs(e)}><Icon name="cal" size={16} /> Ajouter à mon agenda</button>
            {!passe && (e.inscrit
              ? <><span className="pchip ok">✓ Inscrit</span><button className="btn ghost" disabled={busy} onClick={basculer}>Annuler</button></>
              : <button className="btn cta" disabled={busy || !!complet} onClick={basculer}><Icon name="ok" size={16} /> {complet ? 'Complet' : 'Je m’inscris'}</button>)}
          </div>
        </div>
      </div>
      <div className="grid g21">
        <div className="col">
          <div className="card"><h2>Présentation</h2>{e.description ? <p className="prose">{e.description}</p> : <p className="muted small">Présentation à venir.</p>}</div>
          {prog.length > 0 && <div className="card"><h2>Déroulement</h2><ol className="ev-prog">{prog.map((s, i) => <li key={i}><time>{s.heure}</time><span>{s.texte}</span></li>)}</ol></div>}
          {intervenants.length > 0 && (
            <div className="card"><h2>Intervenants</h2>
              <ul className="ev-people">{intervenants.map((p, i) => (
                <li key={i}><span className="ev-ini">{p.nom.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()}</span><div><b>{p.nom}</b>{p.fonction && <span className="small muted">{p.fonction}</span>}</div></li>
              ))}</ul></div>
          )}
        </div>
        <div className="col">
          <div className="card ev-info">
            <div className="ev-row"><span className="tile-ic"><Icon name="cal" size={18} fill /></span><div><span className="small muted">Quand</span><b className="first-up">{day(e.date_debut)}</b><span>{horaire}</span></div></div>
            <div className="ev-row"><span className="tile-ic"><Icon name="pin" size={18} fill /></span>
              <div><span className="small muted">Où</span><b>{e.lieu || (e.format === 'Webinaire' ? 'En ligne' : 'Lieu à préciser')}</b>
                {e.format !== 'Webinaire' && e.lieu && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.lieu)}`} target="_blank" rel="noopener noreferrer">Voir sur la carte</a>}
                {visio ? <a href={visio} target="_blank" rel="noopener noreferrer">Lien de connexion</a> : e.format !== 'Présentiel' && <span className="small muted">Lien de connexion visible une fois inscrit</span>}</div></div>
            <div className="ev-row"><span className="tile-ic"><Icon name="users" size={18} fill /></span>
              <div><span className="small muted">Places</span><b>{e.capacite ? `${Math.max(0, e.capacite - e.inscrits)} place${e.capacite - e.inscrits > 1 ? 's' : ''} restante${e.capacite - e.inscrits > 1 ? 's' : ''}` : 'Places libres'}</b>
                {plein !== null && <div className="bar" aria-label={`${plein} % des places prises`}><i style={{ width: `${plein}%` }} /></div>}</div></div>
            <div className="ev-row"><span className="tile-ic"><Icon name="coin" size={18} fill /></span><div><span className="small muted">Tarif membre</span><b className="first-up">{ar(e.tarif_membre)}</b></div></div>
          </div>
        </div>
      </div>
    </>
  );
}
