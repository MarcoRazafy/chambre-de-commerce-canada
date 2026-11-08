'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isVideo, mediaMembre, newsMembre, type Me, type News } from '@/lib/news-client';
import { toast } from '@/lib/toast';
import type { Row } from '@/lib/format';
import Avatar from '../Avatar';
import Icon from '../Icon';
import ModalBackdrop from '../ModalBackdrop';
import { ESPACE, NewsContexte } from '../news/contexte';
import NewsPost from '../news/NewsPost';
import { appel } from './api';
import { useMoi } from './EspaceShell';

const MAX_PHOTOS = 10;
const courte = (v: string) => new Date(String(v).slice(0, 10) + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const total = (n: News) => n.reactions.reduce((a, r) => a + r.n, 0);

// Créer ou modifier une publication : texte et jusqu'à 10 photos
function Publication({ n, entreprise, memberId, photosDepart, onClose, onSaved }: {
  n: News | null; entreprise: string; memberId: number; photosDepart?: File[]; onClose: () => void; onSaved: (id: number) => void;
}) {
  const [texte, setTexte] = useState(n?.contenu ?? '');
  const [retirer, setRetirer] = useState<number[]>([]);
  const [files, setFiles] = useState<File[]>(photosDepart ?? []);
  const [busy, setBusy] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);
  const gardees = (n?.medias ?? []).filter(m => !retirer.includes(m.id));
  const place = MAX_PHOTOS - gardees.length - files.length;
  const apercus = useMemo(() => files.map(f => URL.createObjectURL(f)), [files]);
  useEffect(() => () => apercus.forEach(u => URL.revokeObjectURL(u)), [apercus]);
  useEffect(() => { const el = ta.current; if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 360) + 'px'; } }, [texte]);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData();
    f.set('texte', texte); f.set('retirer', JSON.stringify(retirer));
    files.forEach(x => f.append('photos', x));
    try { const r = await newsMembre.save(n?.id ?? null, f); toast(n ? 'Publication modifiée.' : 'Publication partagée avec les membres.'); onSaved(r?.id ?? n!.id); }
    catch (x) { toast((x as Error).message, 'error'); setBusy(false); }
  }
  return (
    <ModalBackdrop onClose={() => !busy && onClose()}>
      <form className="modal" style={{ width: 'min(100%, 600px)' }} role="dialog" aria-label={n ? 'Modifier la publication' : 'Créer une publication'} onSubmit={envoyer}>
        <div className="modal-h"><h2>{n ? 'Modifier la publication' : 'Créer une publication'}</h2><button type="button" className="btn sm ghost" aria-label="Fermer" onClick={onClose}>✕</button></div>
        <div className="modal-b">
          <div className="row" style={{ flexWrap: 'nowrap' }}><Avatar kind="member" id={memberId} size={40} nom={entreprise} />
            <div><b>{entreprise}</b><div><span className="pchip">Visible par les membres</span></div></div></div>
          <textarea ref={ta} className="inp es-pub-ta" rows={5} maxLength={5000} autoFocus value={texte} onChange={e => setTexte(e.target.value)} aria-label="Texte de la publication"
            placeholder="Partagez une nouveauté, un besoin, une offre avec les autres membres… #mots-clés bienvenus" />
          <div className="of-photos">
            {(n?.medias ?? []).map(m => (
              <button type="button" key={m.id} className={`of-ph${retirer.includes(m.id) ? ' gone' : ''}`} onClick={() => setRetirer(r => r.includes(m.id) ? r.filter(x => x !== m.id) : [...r, m.id])}
                aria-label={retirer.includes(m.id) ? 'Garder cette photo' : 'Retirer cette photo'}>
                {isVideo(m.type) ? <video src={mediaMembre(m.id) + '#t=0.5'} muted /> : <img src={mediaMembre(m.id)} alt="" />}<span className="of-x"><Icon name="close" size={14} /></span>
              </button>
            ))}
            {apercus.map((u, i) => (
              <button type="button" key={u} className="of-ph new" onClick={() => setFiles(f => f.filter((_, j) => j !== i))} aria-label="Retirer cette photo"><img src={u} alt="" /><span className="of-x"><Icon name="close" size={14} /></span></button>
            ))}
            {place > 0 && (
              <label className="of-add"><Icon name="image" size={22} /><span>Photos</span>
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden onChange={e => { const l = [...(e.target.files ?? [])]; setFiles(f => [...f, ...l].slice(0, f.length + place)); e.target.value = ''; }} /></label>
            )}
          </div>
          <span className="hint">{MAX_PHOTOS} photos au plus, 8 Mo chacune. La Chambre peut relire, modifier ou retirer une publication.</span>
        </div>
        <div className="modal-f"><span className="small muted grow">{texte.length} / 5000</span><button type="button" className="btn" onClick={onClose}>Annuler</button>
          <button className="btn cta" disabled={busy || (!texte.trim() && !gardees.length && !files.length)}><Icon name="send" size={15} /> {busy ? 'Envoi…' : n ? 'Enregistrer' : 'Publier'}</button></div>
      </form>
    </ModalBackdrop>
  );
}

// Actualités de l'espace membre : publications de la Chambre et des membres, réactions, commentaires ; on publie soi-même
export function EspaceActualites() {
  const { moi } = useMoi();
  const [posts, setPosts] = useState<News[] | null>(null);
  const [offres, setOffres] = useState<Row[]>([]);
  const [term, setTerm] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [miennes, setMiennes] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [edition, setEdition] = useState<{ n: News | null; photos?: File[] } | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const saute = useRef(false);

  const charger = useCallback(() => newsMembre.feed().then(setPosts).catch(e => toast(e.message, 'error')), []);
  useEffect(() => { charger(); appel<Row[]>('/api/espace/actualites/offres').then(setOffres).catch(() => {}); }, [charger]);
  // Réactions et commentaires des autres : mis à jour toutes les 30 secondes quand la page est visible
  useEffect(() => { const t = setInterval(() => { if (document.visibilityState === 'visible') charger(); }, 30_000); return () => clearInterval(t); }, [charger]);

  const me: Me | null = moi ? { kind: 'contact', id: moi.contact_id, member_id: moi.member_id } : null;
  const shown = (posts ?? []).filter(n => (!miennes || (n.auteur?.kind === 'contact' && n.auteur.id === moi?.contact_id)) && (!tag || n.tags.includes(tag))
    && (!term || [n.titre, n.contenu ?? '', n.auteur?.entreprise ?? '', ...n.tags].join(' ').toLowerCase().includes(term.toLowerCase())));
  const tags = [...new Set((posts ?? []).flatMap(n => n.tags))].slice(0, 12);
  const aller = (id: number, doux = true) => { setActive(id); document.getElementById(`post-${id}`)?.scrollIntoView({ behavior: doux ? 'smooth' : 'auto', block: 'start' }); };
  // Lien depuis la recherche ou une notification : /espace/actualites?id=12
  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get('id'));
    if (!posts?.length || !id || saute.current) return;
    saute.current = true;
    requestAnimationFrame(() => aller(id, false));
  }, [posts]);
  useEffect(() => {
    if (!posts?.length) return;
    const io = new IntersectionObserver(entries => {
      const top = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (top) setActive(Number(top.target.id.slice(5)));
    }, { rootMargin: '-80px 0px -55% 0px' });
    document.querySelectorAll('.news-main .np').forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [posts, tag, term, miennes]);

  return (
    <NewsContexte value={ESPACE}>
      <div className="head og-head"><div><h1>Actualités</h1><p className="muted">Les nouvelles de la Chambre et des membres. Partagez les vôtres : seuls les membres connectés les voient.</p></div></div>
      <div className="news-layout">
        <div className="news-main">
          {moi && (
            <section className="card es-pub">
              <Avatar kind="member" id={moi.member_id} size={42} nom={moi.entreprise} />
              <button type="button" className="es-pub-faux" onClick={() => setEdition({ n: null })}>Partagez vos besoins, une offre ou une nouveauté avec les membres…</button>
              <button type="button" className="btn ghost es-pub-photo" onClick={() => photoInput.current?.click()} aria-label="Publier des photos"><Icon name="image" size={18} /><span className="lbl2">Photo</span></button>
              <input ref={photoInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden onChange={e => { const l = [...(e.target.files ?? [])].slice(0, MAX_PHOTOS); e.target.value = ''; if (l.length) setEdition({ n: null, photos: l }); }} />
            </section>
          )}
          <div className="tabs es-pub-tabs" role="tablist" aria-label="Publications">
            <button type="button" role="tab" aria-selected={!miennes} className={miennes ? '' : 'on'} onClick={() => setMiennes(false)}>Toutes les publications</button>
            <button type="button" role="tab" aria-selected={miennes} className={miennes ? 'on' : ''} onClick={() => setMiennes(true)}>Mes publications</button>
          </div>
          {posts === null || !me ? <div className="card"><div className="skeleton"><span /><span /><span /></div></div>
            : shown.length === 0 ? (
              <div className="card empty-state"><span className="tile-ic"><Icon name="news" size={18} fill /></span>
                <b>{miennes ? 'Vous n’avez encore rien publié' : posts.length ? 'Aucune actualité ne correspond' : 'Aucune actualité pour le moment'}</b>
                {miennes ? <button className="btn sm cta" onClick={() => setEdition({ n: null })}>Écrire ma première publication</button>
                  : posts.length > 0 && <button className="btn sm" onClick={() => { setTag(null); setTerm(''); }}>Voir toutes les actualités</button>}</div>
            ) : shown.map(n => (
              <NewsPost key={n.id} n={n} me={me} onChanged={charger} onEdit={() => setEdition({ n })} onDeleted={charger} highlight={null}
                onTag={t => { setTag(t); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
            ))}
        </div>

        <aside className="news-side-col">
          <section className="card news-side">
            <div className="news-side-h"><h2>Actualités</h2><span className="small muted">{posts?.length ?? 0}</span></div>
            <label className="search-inp" style={{ maxWidth: 'none' }}><Icon name="search" size={16} />
              <input className="inp" placeholder="Rechercher une actualité…" aria-label="Rechercher une actualité" value={term} onChange={e => setTerm(e.target.value)} /></label>
            {tags.length > 0 && <div className="np-tags">{tags.map(t => <button type="button" key={t} className={`hashtag${tag === t ? ' on' : ''}`} aria-pressed={tag === t} onClick={() => setTag(tag === t ? null : t)}>#{t}</button>)}</div>}
            {tag && <button type="button" className="linkish small" onClick={() => setTag(null)}>Voir toutes les actualités</button>}
            <ul className="news-list">
              {shown.map(n => {
                const m = n.medias[0];
                return (
                  <li key={n.id}>
                    <button type="button" className={n.id === active ? 'on' : ''} aria-current={n.id === active ? 'true' : undefined} onClick={() => aller(n.id)}>
                      <span className="nl-thumb">
                        {m ? (isVideo(m.type) ? <><video src={mediaMembre(m.id) + '#t=0.5'} preload="metadata" muted /><Icon name="play" size={14} fill /></> : <img src={mediaMembre(m.id)} alt="" loading="lazy" />)
                          : n.auteur?.kind === 'contact' && n.auteur.member_id ? <Avatar kind="member" id={n.auteur.member_id} size={44} /> : <Icon name="news" size={20} />}
                      </span>
                      <span className="nl-txt">
                        <b>{n.titre}</b>
                        <span className="small muted">{courte(n.created_at ?? n.date_pub)} · {n.auteur?.kind === 'contact' ? n.auteur.entreprise : n.categorie ?? 'La Chambre'}</span>
                        {(total(n) > 0 || n.commentaires.length > 0) && <span className="small muted">{total(n) > 0 && `👍 ${total(n)}`}{total(n) > 0 && n.commentaires.length > 0 && ' · '}{n.commentaires.length > 0 && `💬 ${n.commentaires.length}`}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
          {offres.length > 0 && (
            <section className="card es-offres">
              <div className="news-side-h"><h2>Offres des membres</h2><Link className="small" href="/espace/annuaire">Annuaire</Link></div>
              <ul>
                {offres.map(o => (
                  <li key={o.id}><Link href={`/espace/annuaire/${o.member_id}`}>
                    <span className="nl-thumb">{o.photo ? <img src={`/api/produits/photos/${o.photo}`} alt="" loading="lazy" /> : <Avatar kind="member" id={o.member_id} size={44} />}</span>
                    <span className="nl-txt"><b>{o.label}</b><span className="small muted">{o.entreprise}{o.prix ? ` · ${o.prix}` : ''}</span></span>
                  </Link></li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
      {edition && moi && <Publication n={edition.n} photosDepart={edition.photos} entreprise={moi.entreprise} memberId={moi.member_id} onClose={() => setEdition(null)}
        onSaved={id => { setEdition(null); charger().then(() => requestAnimationFrame(() => aller(id))); }} />}
    </NewsContexte>
  );
}
