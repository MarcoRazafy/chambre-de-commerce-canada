'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { CATS, FMTS, FMT_ICON } from '@/lib/bibliotheque';
import { lireBlocs } from '@/lib/blocs';
import { relative, type Row } from '@/lib/format';
import { isVideo } from '@/lib/news-client';
import { toast } from '@/lib/toast';
import Avatar from '../Avatar';
import Icon from '../Icon';
import { Gallery, LONG, Lightbox } from '../news/NewsPost';
import RichText from '../news/RichText';
import PageRessource, { PieceJointe } from '../ressources/PageRessource';
import { appel, argent, jour } from './api';


/* ===== Actualités : même mise en page que le back-office (fil + colonne de droite), en lecture ===== */
const mediaNews = (id: number) => `/api/espace/actualites/medias/${id}`;
const courte = (v: string) => new Date(String(v).slice(0, 10) + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

function PostLu({ n, onTag }: { n: Row; onTag: (t: string) => void }) {
  const [plus, setPlus] = useState(false);
  const [vue, setVue] = useState<number | null>(null);
  const texte: string = n.contenu ?? '';
  const long = texte.length > LONG && !plus;
  const date = n.created_at && relative(n.created_at) ? relative(n.created_at)! : courte(n.date_pub);
  return (
    <article className="card np" id={`post-${n.id}`}>
      <header className="np-h">
        {n.auteur ? <Avatar kind="user" id={n.auteur.id} size={42} /> : <img className="np-org" src="/logo-app.png" alt="" width={42} height={42} />}
        <div className="grow"><b>{n.auteur?.nom ?? 'CanCham Madagascar'}</b><span className="small muted"><time dateTime={n.created_at}>{date}</time></span></div>
        {n.categorie && <span className="np-cat">{n.categorie}</span>}
      </header>
      <div className="np-body">
        <h2>{n.titre}</h2>
        {texte && <p className="np-text"><RichText text={long ? texte.slice(0, LONG).replace(/\s+\S*$/, '') + '… ' : texte} onTag={onTag} />
          {long && <button type="button" className="linkish" onClick={() => setPlus(true)}>Voir plus</button>}</p>}
        {n.tags?.length > 0 && <div className="np-tags">{n.tags.map((t: string) => <button type="button" key={t} className="hashtag" onClick={() => onTag(t)}>#{t}</button>)}</div>}
      </div>
      <Gallery medias={n.medias ?? []} onOpen={setVue} url={mediaNews} />
      {vue !== null && <Lightbox medias={n.medias} start={vue} onClose={() => setVue(null)} url={mediaNews} />}
    </article>
  );
}

export function EspaceActualites() {
  const [posts, setPosts] = useState<Row[] | null>(null);
  const [term, setTerm] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [active, setActive] = useState<number | null>(null);
  useEffect(() => { appel<Row[]>('/api/espace/actualites').then(setPosts).catch(e => toast(e.message, 'error')); }, []);
  const shown = (posts ?? []).filter(n => (!tag || n.tags?.includes(tag)) && (!term || [n.titre, n.contenu].join(' ').toLowerCase().includes(term.toLowerCase())));
  const tags = [...new Set((posts ?? []).flatMap(n => n.tags ?? []))].sort() as string[];
  const aller = (id: number) => { setActive(id); document.getElementById(`post-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  useEffect(() => {
    if (!posts?.length) return;
    const io = new IntersectionObserver(entries => {
      const top = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (top) setActive(Number(top.target.id.slice(5)));
    }, { rootMargin: '-80px 0px -55% 0px' });
    document.querySelectorAll('.news-main .np').forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [posts, tag, term]);
  return (
    <>
      <div className="head og-head"><div><h1>Actualités</h1><p className="muted">Les nouvelles de la Chambre, publiées pour les membres.</p></div></div>
      <div className="news-layout">
        <div className="news-main">
          {posts === null ? <div className="card"><div className="skeleton"><span /><span /><span /></div></div>
            : shown.length === 0 ? <div className="card empty-state"><span className="tile-ic"><Icon name="news" size={18} fill /></span><b>{posts.length ? 'Aucune actualité ne correspond' : 'Aucune actualité pour le moment'}</b>
              {posts.length > 0 && <button className="btn sm" onClick={() => { setTag(null); setTerm(''); }}>Voir toutes les actualités</button>}</div>
            : shown.map(n => <PostLu key={n.id} n={n} onTag={t => { setTag(t); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />)}
        </div>
        <aside className="card news-side">
          <div className="news-side-h"><h2>Actualités</h2><span className="small muted">{posts?.length ?? 0}</span></div>
          <label className="search-inp" style={{ maxWidth: 'none' }}><Icon name="search" size={16} />
            <input className="inp" placeholder="Rechercher une actualité…" aria-label="Rechercher une actualité" value={term} onChange={e => setTerm(e.target.value)} /></label>
          {tags.length > 0 && <div className="np-tags">{tags.map(t => <button type="button" key={t} className={`hashtag${tag === t ? ' on' : ''}`} aria-pressed={tag === t} onClick={() => setTag(tag === t ? null : t)}>#{t}</button>)}</div>}
          {tag && <button type="button" className="linkish small" onClick={() => setTag(null)}>Voir toutes les actualités</button>}
          <ul className="news-list">
            {shown.map(n => {
              const m = n.medias?.[0];
              return (
                <li key={n.id}>
                  <button type="button" className={n.id === active ? 'on' : ''} aria-current={n.id === active ? 'true' : undefined} onClick={() => aller(n.id)}>
                    <span className="nl-thumb">{m ? (isVideo(m.type) ? <><video src={mediaNews(m.id) + '#t=0.5'} preload="metadata" muted /><Icon name="play" size={14} fill /></> : <img src={mediaNews(m.id)} alt="" loading="lazy" />) : <Icon name="news" size={20} />}</span>
                    <span className="nl-txt"><b>{n.titre}</b><span className="small muted">{courte(n.date_pub)}{n.categorie ? ` · ${n.categorie}` : ''}</span></span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
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
