'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { isVideo, mediaUrl, news, type News } from '@/lib/news-client';
import Icon from '../Icon';
import NewsEditor from './NewsEditor';
import NewsPost from './NewsPost';

const short = (d: string) => new Date(d.slice(0, 10) + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const count = (n: News) => n.reactions.reduce((a, r) => a + r.n, 0);

// Page Actualités : toutes les publications l'une sous l'autre (fil), la liste à droite pour y sauter.
// ?id= fait défiler jusqu'à une actualité, &c= met un commentaire en évidence (liens des notifications de mention)
export default function Actualites() {
  const router = useRouter();
  const sp = useSearchParams();
  const [me, setMe] = useState<{ id: number; role: string } | null>(null);
  const [posts, setPosts] = useState<News[] | null>(null);
  const [term, setTerm] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [editing, setEditing] = useState<News | 'new' | null>(null);
  const [error, setError] = useState('');
  const target = Number(sp.get('id')) || null;
  const highlight = Number(sp.get('c')) || null;
  const jumped = useRef<string | null>(null);

  useEffect(() => { fetch('/api/auth/me').then(r => r.json()).then(d => d.user && setMe(d.user)); }, []);
  const load = useCallback(() => news.feed().then(p => { setPosts(p); setError(''); }).catch(e => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);
  // Réactions et commentaires des collègues : mis à jour toutes les 20 secondes quand la page est visible
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 20_000);
    return () => clearInterval(t);
  }, [load]);

  const shown = (posts ?? []).filter(n => (!tag || n.tags.includes(tag)) &&
    (!term || [n.titre, n.contenu ?? '', ...n.tags].join(' ').toLowerCase().includes(term.toLowerCase())));
  const allTags = [...new Set((posts ?? []).flatMap(n => n.tags))].slice(0, 12);

  function go(id: number, smooth = true) {
    const el = document.getElementById(`post-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    setActive(id);
  }
  // Arrivée par un lien (?id=, &c=) : une seule fois par adresse, quand le fil est affiché
  useEffect(() => {
    const key = sp.toString();
    if (!posts || !target || jumped.current === key) return;
    jumped.current = key;
    requestAnimationFrame(() => {
      if (highlight) document.getElementById(`c-${highlight}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      else go(target, false);
    });
  }, [posts, target, highlight, sp]);

  // La liste de droite suit l'actualité visible à l'écran
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
      <div className="head page-tools"><div className="actions"><button className="btn cta" onClick={() => setEditing('new')}><Icon name="plus" size={16} /> Nouvelle actualité</button></div></div>
      {error && <div className="err">{error}</div>}
      <div className="news-layout">
        <div className="news-main">
          {posts === null || !me ? <div className="card"><div className="skeleton"><span /><span /><span /></div></div>
            : posts.length === 0 ? (
              <div className="card empty-state">
                <span className="tile-ic"><Icon name="news" size={18} fill /></span>
                <b>Aucune actualité pour le moment</b>
                <button className="btn sm cta" onClick={() => setEditing('new')}>Écrire la première</button>
              </div>
            ) : shown.length === 0 ? (
              <div className="card empty-state"><b>Aucune actualité ne correspond</b>
                <button className="btn sm" onClick={() => { setTag(null); setTerm(''); }}>Voir toutes les actualités</button></div>
            ) : shown.map(n => (
              <NewsPost key={n.id} n={n} me={me} onChanged={load} onEdit={() => setEditing(n)} highlight={highlight}
                onDeleted={() => { if (target === n.id) router.replace('/actualites', { scroll: false }); load(); }} onTag={t => { setTag(t); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
            ))}
        </div>

        <aside className="card news-side">
          <div className="news-side-h"><h2>Actualités</h2><span className="small muted">{posts?.length ?? 0}</span></div>
          <label className="search-inp" style={{ maxWidth: 'none' }}><Icon name="search" size={16} />
            <input className="inp" placeholder="Rechercher une actualité…" aria-label="Rechercher une actualité" value={term} onChange={e => setTerm(e.target.value)} /></label>
          {allTags.length > 0 && (
            <div className="np-tags">
              {allTags.map(t => <button type="button" key={t} className={`hashtag${tag === t ? ' on' : ''}`} aria-pressed={tag === t} onClick={() => setTag(tag === t ? null : t)}>#{t}</button>)}
            </div>
          )}
          {tag && <button type="button" className="linkish small" onClick={() => setTag(null)}>Voir toutes les actualités</button>}
          <ul className="news-list">
            {shown.map(n => {
              const m = n.medias[0];
              return (
                <li key={n.id}>
                  <button type="button" className={n.id === active ? 'on' : ''} aria-current={n.id === active ? 'true' : undefined} onClick={() => go(n.id)}>
                    <span className="nl-thumb">
                      {m ? (isVideo(m.type) ? <><video src={mediaUrl(m.id) + '#t=0.5'} preload="metadata" muted /><Icon name="play" size={14} fill /></> : <img src={mediaUrl(m.id)} alt="" loading="lazy" />)
                        : <Icon name="news" size={20} />}
                    </span>
                    <span className="nl-txt">
                      <b>{n.titre}</b>
                      <span className="small muted">{short(n.date_pub)} · <span className={`state${n.publie ? ' on' : ''}`}>{n.publie ? 'Publiée' : 'Brouillon'}</span></span>
                      {(count(n) > 0 || n.commentaires.length > 0) && <span className="small muted">{count(n) > 0 && `👍 ${count(n)}`}{count(n) > 0 && n.commentaires.length > 0 && ' · '}{n.commentaires.length > 0 && `💬 ${n.commentaires.length}`}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
      {editing && <NewsEditor n={editing === 'new' ? null : editing} onClose={() => setEditing(null)}
        onSaved={nid => { setEditing(null); load().then(() => requestAnimationFrame(() => go(nid))); }} />}
    </>
  );
}
