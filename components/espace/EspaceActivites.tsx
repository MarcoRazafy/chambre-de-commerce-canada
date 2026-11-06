'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { CATS, FMTS, FMT_ICON } from '@/lib/bibliotheque';
import { lireBlocs } from '@/lib/blocs';
import type { Row } from '@/lib/format';
import { toast } from '@/lib/toast';
import Icon from '../Icon';
import PageRessource, { PieceJointe } from '../ressources/PageRessource';
import { appel, argent, jour } from './api';

const dateCourte = (v: string) => { const d = new Date(v); return { m: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''), j: d.getDate() }; };
const heure = (v: string) => new Date(v).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

/* ===== Événements ===== */
export function EspaceEvenements() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const charger = useCallback(() => appel<Row[]>('/api/espace/evenements').then(setRows).catch(e => toast(e.message, 'error')), []);
  useEffect(() => { charger(); }, [charger]);
  async function basculer(e: Row) {
    if (e.inscrit && !confirm(`Annuler votre inscription à « ${e.titre} » ?`)) return;
    setBusy(e.id);
    try { await appel(`/api/espace/evenements/${e.id}`, e.inscrit ? 'DELETE' : 'POST'); toast(e.inscrit ? 'Inscription annulée.' : 'Vous êtes inscrit. À bientôt !'); charger(); }
    catch (x) { toast((x as Error).message, 'error'); } finally { setBusy(null); }
  }
  return (
    <>
      <div className="head"><div><h1>Événements</h1><p className="muted">Les rendez-vous de la Chambre à venir. Inscrivez-vous en un clic.</p></div></div>
      {rows === null ? <div className="card"><div className="skeleton"><span /><span /></div></div>
        : rows.length === 0 ? <div className="card empty-state"><Icon name="cal" size={24} /><b>Aucun événement à venir pour le moment</b></div> : (
          <div className="es-evs">
            {rows.map(e => {
              const d = dateCourte(e.date_debut), plein = e.capacite && e.inscrits >= e.capacite;
              return (
                <article key={e.id} className={`card es-ev${e.inscrit ? ' inscrit' : ''}`}>
                  <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                    <div className="dt-cal"><span>{d.m}</span><b>{d.j}</b></div>
                    <div className="grow"><b className="es-nom">{e.titre}</b>
                      <small className="muted">{jour(e.date_debut)} à {heure(e.date_debut)} · {e.format}{e.lieu ? ` · ${e.lieu}` : ''}</small></div>
                  </div>
                  {e.description && <p className="small es-desc">{e.description}</p>}
                  <div className="row small muted">
                    <span>{e.tarif_membre ? `${argent(Number(e.tarif_membre), 'MGA')} pour les membres` : 'Gratuit pour les membres'}</span>
                    {e.capacite ? <span>· {Math.max(0, e.capacite - e.inscrits)} place{e.capacite - e.inscrits > 1 ? 's' : ''} restante{e.capacite - e.inscrits > 1 ? 's' : ''}</span> : null}
                  </div>
                  {e.inscrit && e.lien_visio && <a className="small" href={e.lien_visio} target="_blank" rel="noopener noreferrer"><Icon name="external" size={13} /> Lien de connexion</a>}
                  <div className="row">
                    {e.inscrit ? <><span className="pchip ok">✓ Inscrit</span><button className="btn sm ghost" disabled={busy === e.id} onClick={() => basculer(e)}>Annuler</button></>
                      : <button className="btn sm cta" disabled={busy === e.id || !!plein} onClick={() => basculer(e)}>{plein ? 'Complet' : 'S’inscrire'}</button>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
    </>
  );
}

/* ===== Actualités ===== */
export function EspaceActualites() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [ouvert, setOuvert] = useState<number | null>(null);
  useEffect(() => { appel<Row[]>('/api/espace/actualites').then(setRows).catch(e => toast(e.message, 'error')); }, []);
  return (
    <>
      <div className="head"><div><h1>Actualités</h1><p className="muted">Les nouvelles de la Chambre et de ses membres.</p></div></div>
      {rows === null ? <div className="card"><div className="skeleton"><span /><span /></div></div>
        : rows.length === 0 ? <div className="card empty-state"><Icon name="news" size={24} /><b>Aucune actualité pour le moment</b></div> : (
          <div className="es-news">
            {rows.map(n => {
              const img = n.medias?.find((x: Row) => String(x.type).startsWith('image/'));
              const long = String(n.contenu ?? '').length > 320;
              return (
                <article key={n.id} className="card es-post">
                  {img && <img className="es-post-img" src={`/api/espace/actualites/medias/${img.id}`} alt="" loading="lazy" />}
                  <span className="eyebrow">{[n.categorie, jour(n.date_pub)].filter(Boolean).join(' · ')}</span>
                  <h2>{n.titre}</h2>
                  <p className={`small es-post-txt${long && ouvert !== n.id ? ' coupe' : ''}`}>{n.contenu}</p>
                  {long && <button type="button" className="btn sm ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setOuvert(ouvert === n.id ? null : n.id)}>{ouvert === n.id ? 'Réduire' : 'Lire la suite'}</button>}
                </article>
              );
            })}
          </div>
        )}
    </>
  );
}

/* ===== Ressources ===== */
const blocsDe = (v: unknown) => { const l = lireBlocs(v); return 'blocs' in l && l.blocs ? l.blocs : []; };
const media = (id: number) => `/api/espace/ressources/medias/${id}`;
export function EspaceRessources() {
  const [d, setD] = useState<{ dossiers: Row[]; ressources: Row[] } | null>(null);
  const [dossier, setDossier] = useState<number | null>(null);
  const [term, setTerm] = useState('');
  useEffect(() => { appel('/api/espace/ressources').then(setD).catch(e => toast(e.message, 'error')); }, []);
  if (!d) return <><div className="head"><div><h1>Ressources</h1></div></div><div className="card"><div className="skeleton"><span /><span /></div></div></>;
  const par = new Map(d.dossiers.map(x => [x.id, x]));
  const chemin: Row[] = [];
  for (let x = dossier != null ? par.get(dossier) : undefined, n = 0; x && n < 10; x = x.parent_id != null ? par.get(x.parent_id) : undefined, n++) chemin.unshift(x);
  const sous = d.dossiers.filter(x => (x.parent_id ?? null) === dossier);
  const liste = term ? d.ressources.filter(r => [r.titre, r.description].join(' ').toLowerCase().includes(term.toLowerCase()))
    : d.ressources.filter(r => (r.dossier_id ?? null) === dossier);
  return (
    <>
      <div className="head"><div><h1>Ressources</h1><p className="muted">Guides, modèles, formations et rapports réservés aux membres.</p></div></div>
      <div className="filters">
        <label className="search-inp"><Icon name="search" size={16} /><input className="inp" placeholder="Rechercher une ressource…" aria-label="Rechercher une ressource" value={term} onChange={e => setTerm(e.target.value)} /></label>
      </div>
      {!term && <nav className="crumbs" aria-label="Dossiers">
        <button type="button" className="linkish" onClick={() => setDossier(null)}>Toutes les ressources</button>
        {chemin.map(x => <span key={x.id}><span className="crumb-sep">›</span> <button type="button" className="linkish" onClick={() => setDossier(x.id)}>{x.nom}</button></span>)}
      </nav>}
      {!term && sous.length > 0 && <div className="es-dossiers">{sous.map(x => (
        <button key={x.id} type="button" className="card es-dossier" onClick={() => setDossier(x.id)}><span className="tile-ic"><Icon name="folder" size={18} fill /></span><b>{x.nom}</b>
          <small className="muted">{d.ressources.filter(r => r.dossier_id === x.id).length} ressource(s)</small></button>))}</div>}
      {(liste.length > 0 || term || sous.length === 0) && <section className="card">
        {liste.length === 0 ? <p className="small muted">{term ? 'Aucune ressource ne correspond.' : 'Aucune ressource ici.'}</p> : (
          <ul className="es-res">
            {liste.map(r => (
              <li key={r.id}>
                <span className="tile-ic xs"><Icon name={FMT_ICON[r.fmt] ?? 'file'} size={14} fill /></span>
                <span className="grow"><Link href={`/espace/ressources/${r.id}`}><b>{r.titre}</b></Link>
                  <small className="muted">{[CATS[r.cat], FMTS[r.fmt], r.taille !== '—' && r.taille].filter(Boolean).join(' · ')}</small></span>
                {!r.ouverte ? <span className="pchip warn"><Icon name="lock" size={12} /> {argent(Number(r.prix), 'MGA')}</span> : null}
                <Link className="btn sm" href={`/espace/ressources/${r.id}`}>{r.ouverte ? 'Ouvrir' : 'Voir'}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>}
    </>
  );
}

export function EspaceRessource() {
  const { id } = useParams<{ id: string }>();
  const [r, setR] = useState<Row | null>(null);
  const [erreur, setErreur] = useState('');
  useEffect(() => { appel<Row>(`/api/espace/ressources/${id}`).then(setR).catch(e => setErreur(e.message)); }, [id]);
  if (!r) return erreur ? <div className="err">{erreur}</div> : <div className="card"><div className="skeleton"><span /><span /></div></div>;
  const url = r.fichier ? media(r.fichier) : null;
  return (
    <>
      <div className="head"><div><span className="eyebrow">{[CATS[r.cat], FMTS[r.fmt]].filter(Boolean).join(' · ')}</span><h1>{r.titre}</h1>{r.description && <p className="muted">{r.description}</p>}</div>
        <div className="actions"><Link className="btn" href="/espace/ressources">‹ Ressources</Link>{url && <a className="btn" href={`${url}?dl=1`}><Icon name="download" size={16} /> Télécharger</a>}</div></div>
      {!r.ouverte ? (
        <div className="card empty-state"><Icon name="lock" size={24} /><b>Ressource payante · {argent(Number(r.prix), 'MGA')}</b>
          <span className="small muted">Demandez l’accès à la Chambre : elle vous l’ouvre après règlement.</span>
          <Link className="btn sm cta" href="/espace/messagerie?ecrire=1">Écrire à la Chambre</Link></div>
      ) : r.fmt === 'page' ? <PageRessource titre={r.titre} blocs={blocsDe(r.contenu)} media={media} />
        : !url ? <div className="card empty-state"><b>Le fichier de cette ressource n’est pas encore disponible</b></div>
        : r.fmt === 'video' ? <div className="pr-video"><video src={url} controls playsInline preload="metadata" aria-label={r.titre} /></div>
        : r.fmt === 'image' ? <figure className="pr-photo"><img src={url} alt={r.titre} /></figure>
        : <PieceJointe url={url} nom={r.fichier_nom ?? r.titre} actions={<a className="btn sm" href={`${url}?dl=1`}><Icon name="download" size={14} /> Télécharger</a>} />}
    </>
  );
}
