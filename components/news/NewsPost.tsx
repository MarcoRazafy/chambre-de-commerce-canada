'use client';
import { useEffect, useRef, useState } from 'react';
import { chat, chatChanged, type Thread } from '@/lib/chat';
import { relative } from '@/lib/format';
import { isVideo, mediaUrl, news, type Media, type News } from '@/lib/news-client';
import { toast } from '@/lib/toast';
import Avatar from '../Avatar';
import Icon from '../Icon';
import ModalBackdrop from '../ModalBackdrop';
import Comments, { type CommentsHandle } from './Comments';
import { ReactButton, ReactionSummary } from './Reactions';
import RichText from './RichText';

type Me = { id: number; role: string };
const fail = (e: unknown) => toast((e as Error).message, 'error');
export const LONG = 420;   // au-delà, le texte est replié avec « Voir plus »

// Grille des médias façon Facebook : 1 en grand, 2 côte à côte, 3 (un grand + deux), 4 et plus (2 × 2, « +N » sur le dernier)
export function Gallery({ medias, onOpen, url = mediaUrl }: { medias: Media[]; onOpen: (i: number) => void; url?: (id: number) => string }) {
  if (!medias.length) return null;
  const shown = medias.slice(0, 4);
  return (
    <div className={`np-grid n${Math.min(medias.length, 4)}`}>
      {shown.map((m, i) => (
        <button type="button" key={m.id} className="np-cell" onClick={() => onOpen(i)} aria-label={`Ouvrir ${m.nom}`}>
          {isVideo(m.type)
            ? <><video src={url(m.id) + '#t=0.5'} preload="metadata" muted playsInline /><span className="np-play"><Icon name="play" size={26} fill /></span></>
            : <img src={url(m.id)} alt="" loading="lazy" />}
          {i === 3 && medias.length > 4 && <span className="np-more">+{medias.length - 4}</span>}
        </button>
      ))}
    </div>
  );
}

// Visionneuse plein écran : flèches du clavier, Échap pour fermer
export function Lightbox({ medias, start, onClose, url = mediaUrl }: { medias: Media[]; start: number; onClose: () => void; url?: (id: number) => string }) {
  const [i, setI] = useState(start);
  const m = medias[i];
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setI(x => (x + 1) % medias.length);
      if (e.key === 'ArrowLeft') setI(x => (x - 1 + medias.length) % medias.length);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [medias.length]);
  return (
    <ModalBackdrop onClose={onClose}>
      <div className="lightbox" role="dialog" aria-label="Photos et vidéos">
        <button type="button" className="lb-close tb-btn" aria-label="Fermer" onClick={onClose}><Icon name="close" size={22} /></button>
        {medias.length > 1 && <button type="button" className="lb-nav prev" aria-label="Précédente" onClick={() => setI(x => (x - 1 + medias.length) % medias.length)}><Icon name="back" size={22} /></button>}
        {isVideo(m.type) ? <video key={m.id} src={url(m.id)} controls autoPlay playsInline /> : <img key={m.id} src={url(m.id)} alt={m.nom} />}
        {medias.length > 1 && <button type="button" className="lb-nav next" aria-label="Suivante" onClick={() => setI(x => (x + 1) % medias.length)}><Icon name="back" size={22} /></button>}
        {medias.length > 1 && <span className="lb-count">{i + 1} / {medias.length}</span>}
      </div>
    </ModalBackdrop>
  );
}

// Partager : lien copié, ou envoyé dans une conversation de la messagerie
function ShareModal({ n, onClose }: { n: News; onClose: () => void }) {
  const [term, setTerm] = useState('');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [sent, setSent] = useState<number[]>([]);
  const link = `${window.location.origin}/actualites?id=${n.id}`;
  useEffect(() => { const t = setTimeout(() => chat.list('tous', term).then(setThreads).catch(() => {}), 200); return () => clearTimeout(t); }, [term]);
  async function send(t: Thread) {
    try { await chat.send(t.id, `📰 ${n.titre}\n${link}`, []); setSent(s => [...s, t.id]); chatChanged(); } catch (e) { fail(e); }
  }
  return (
    <ModalBackdrop onClose={onClose}>
      <div className="modal" style={{ width: 'min(100%, 480px)' }}>
        <div className="modal-h"><h2>Partager</h2><button type="button" className="btn sm ghost" aria-label="Fermer" onClick={onClose}>✕</button></div>
        <div className="modal-b">
          <button type="button" className="btn" onClick={() => navigator.clipboard.writeText(link).then(() => toast('Lien copié'), fail)}><Icon name="attach" size={16} /> Copier le lien</button>
          <label className="search-inp" style={{ maxWidth: 'none' }}><Icon name="search" size={16} /><input className="inp" placeholder="Envoyer dans une conversation…" aria-label="Chercher une conversation" value={term} onChange={e => setTerm(e.target.value)} /></label>
          <ul className="fwd-list">
            {threads.slice(0, 12).map(t => (
              <li key={t.id}>
                <b className="grow">{t.titre}</b>
                <button type="button" className="btn sm" disabled={sent.includes(t.id)} onClick={() => send(t)}>{sent.includes(t.id) ? 'Envoyé' : 'Envoyer'}</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ModalBackdrop>
  );
}

// Une actualité affichée comme une publication : en-tête, texte, médias, réactions, commentaires
export default function NewsPost({ n, me, onChanged, onEdit, onDeleted, onTag, highlight }: {
  n: News; me: Me; onChanged: () => void; onEdit: () => void; onDeleted: () => void; onTag: (t: string) => void; highlight: number | null;
}) {
  const [more, setMore] = useState(false);
  const [menu, setMenu] = useState(false);
  const [view, setView] = useState<number | null>(null);
  const [share, setShare] = useState(false);
  // Dans le fil, les longues discussions restent repliées (sauf celle d'un lien vers un commentaire)
  const [showComments, setShowComments] = useState(() => n.commentaires.length <= 3 || n.commentaires.some(c => c.id === highlight));
  const comments = useRef<CommentsHandle>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);

  const texte = n.contenu ?? '';
  const long = texte.length > LONG && !more;
  const date = n.created_at && relative(n.created_at) ? relative(n.created_at)! : new Date(n.date_pub + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  async function remove() {
    setMenu(false);
    if (!confirm(`Supprimer « ${n.titre} » avec ses photos, réactions et commentaires ?`)) return;
    try { await news.remove(n.id); toast('Actualité supprimée'); onDeleted(); } catch (e) { fail(e); }
  }
  async function publish() {
    setMenu(false);
    try { await news.publish(n.id, !n.publie); toast(n.publie ? 'Actualité repassée en brouillon' : 'Actualité publiée'); onChanged(); } catch (e) { fail(e); }
  }

  return (
    <article className="card np" id={`post-${n.id}`}>
      <header className="np-h">
        {/* Sans auteur (actualités créées avant l'ajout de l'auteur) : publiée au nom de la plateforme */}
        {n.auteur ? <Avatar kind="user" id={n.auteur.id} size={42} /> : <img className="np-org" src="/logo-app.png" alt="" width={42} height={42} />}
        <div className="grow">
          <b>{n.auteur?.nom ?? 'L’Alliée Virtuelle'}</b>
          <span className="small muted"><time dateTime={n.created_at}>{date}</time>{n.updated_at && ' · modifié'}</span>
        </div>
        {n.categorie && <span className="np-cat">{n.categorie}</span>}
        {!n.publie && <span className="chip c-amber"><Icon name="clock" size={14} />Brouillon</span>}
        <div className="np-menu" ref={menuRef}>
          <button type="button" className="tb-btn" aria-label="Plus d’actions" aria-expanded={menu} onClick={() => setMenu(m => !m)}><Icon name="more" size={20} /></button>
          {menu && (
            <div className="np-pop pop" role="menu">
              <button type="button" role="menuitem" onClick={() => { setMenu(false); onEdit(); }}><Icon name="edit" size={16} />Modifier</button>
              <button type="button" role="menuitem" onClick={publish}><Icon name={n.publie ? 'archive' : 'send'} size={16} />{n.publie ? 'Repasser en brouillon' : 'Publier'}</button>
              <button type="button" role="menuitem" onClick={() => { setMenu(false); setShare(true); }}><Icon name="share" size={16} />Partager</button>
              <button type="button" role="menuitem" className="danger" onClick={remove}><Icon name="trash" size={16} />Supprimer</button>
            </div>
          )}
        </div>
      </header>

      <div className="np-body">
        <h2>{n.titre}</h2>
        {texte && <p className="np-text"><RichText text={long ? texte.slice(0, LONG).replace(/\s+\S*$/, '') + '… ' : texte} onTag={onTag} />
          {long && <button type="button" className="linkish" onClick={() => setMore(true)}>Voir plus</button>}</p>}
        {n.tags.length > 0 && <div className="np-tags">{n.tags.map(t => <button type="button" key={t} className="hashtag" onClick={() => onTag(t)}>#{t}</button>)}</div>}
      </div>

      <Gallery medias={n.medias} onOpen={setView} />

      <div className="np-stats">
        <ReactionSummary reactions={n.reactions} />
        {n.commentaires.length > 0 && <button type="button" className="linkish" onClick={() => setShowComments(s => !s)}>{n.commentaires.length} commentaire{n.commentaires.length > 1 ? 's' : ''}</button>}
      </div>
      <div className="np-actions">
        <ReactButton reactions={n.reactions} onReact={e => news.react(n.id, e).then(onChanged, fail)} />
        <button type="button" className="np-act" onClick={() => { setShowComments(true); setTimeout(() => comments.current?.focus(), 0); }}><Icon name="chat" size={18} />Commenter</button>
        <button type="button" className="np-act" onClick={() => setShare(true)}><Icon name="share" size={18} />Partager</button>
      </div>

      {showComments && <Comments ref={comments} newsId={n.id} comments={n.commentaires} me={me} onChanged={onChanged} highlight={highlight} />}
      {view !== null && <Lightbox medias={n.medias} start={view} onClose={() => setView(null)} />}
      {share && <ShareModal n={n} onClose={() => setShare(false)} />}
    </article>
  );
}
