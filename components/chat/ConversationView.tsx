'use client';
import Link from 'next/link';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import type { Row } from '@/lib/format';
import { REACTIONS, chat, chatChanged, dayLabel, hm, onlyEmoji, size, type Thread } from '@/lib/chat';
import { toast } from '@/lib/toast';
import ModalBackdrop from '../ModalBackdrop';
import Avatar, { ThreadAvatar } from '../Avatar';
import Icon from '../Icon';
import Composer from './Composer';

type Props = {
  id: number;
  meId: number;
  compact?: boolean;                 // fenêtre flottante
  infoOpen?: boolean;
  onToggleInfo?: () => void;
  onClose?: () => void;
  onBack?: () => void;                 // mobile : retour à la liste
  onMinimize?: () => void;
  onData?: (d: Row) => void;         // transmet la conversation chargée (panneau d'informations)
};

const URL_RE = /(https?:\/\/[^\s<]+)/g;
const linkify = (t: string) => t.split(URL_RE).map((part, i) => (i % 2 ? <a key={i} href={part} target="_blank" rel="noreferrer noopener">{part}</a> : part));

export function subtitle(d: Row, meId: number) {
  if (d.type === 'membre') return ['Membre', d.membre?.secteur, d.membre?.ville].filter(Boolean).join(' · ');
  if (d.type === 'groupe') return `Groupe · ${d.participants.length} participant(s)${d.member_id ? '' : ''}`;
  const o = d.participants.find((p: Row) => !(p.kind === 'user' && p.id === meId));
  return o?.fonction || o?.role || 'Équipe';
}

export default function ConversationView({ id, meId, compact, infoOpen, onToggleInfo, onClose, onMinimize, onData, onBack }: Props) {
  const [d, setD] = useState<Row | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<{ id: number; texte: string } | null>(null);
  const [drop, setDrop] = useState<File[] | undefined>();
  const [over, setOver] = useState(false);
  const [reply, setReply] = useState<Row | null>(null);
  const [pop, setPop] = useState<{ mid: number; kind: 'react' | 'more' } | null>(null);
  const [fwd, setFwd] = useState<Row | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);
  const dataCb = useRef(onData);
  dataCb.current = onData;

  const load = useCallback(async () => {
    try {
      const x = await chat.get(id);
      setD(x);
      dataCb.current?.(x);
      setError('');
      if (x.messages.length !== lastCount.current) {   // descend en bas seulement s'il y a du nouveau
        lastCount.current = x.messages.length;
        requestAnimationFrame(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight }));
        chatChanged();
      }
    } catch (e) { setError((e as Error).message); }
  }, [id]);

  useEffect(() => {
    lastCount.current = 0;
    setD(null);
    load();
    const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 4000);
    return () => clearInterval(t);
  }, [load]);

  // Ferme le petit menu (réactions, ⋮) au clic à côté ou avec Échap
  useEffect(() => {
    if (!pop) return;
    const close = (e: Event) => { if (e instanceof KeyboardEvent ? e.key === 'Escape' : !(e.target as Element).closest('.b-actions')) setPop(null); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [pop]);

  async function send(texte: string, files: File[], entrant: number | null) {
    await chat.send(id, texte, files, entrant, reply?.id);
    setReply(null);
    await load();
  }
  async function react(mid: number, emoji: string) {
    setPop(null);
    try { await chat.react(mid, emoji); load(); } catch (e) { setError((e as Error).message); }
  }
  function copy(t: string) {
    setPop(null);
    navigator.clipboard?.writeText(t).then(() => toast('Message copié.'), () => toast('Copie impossible', 'error'));
  }
  function goTo(mid: number) {
    const el = document.getElementById(`m-${mid}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 1200);
  }
  async function saveEdit() {
    if (!editing) return;
    try { await chat.editMsg(editing.id, editing.texte); setEditing(null); load(); } catch (e) { setError((e as Error).message); }
  }
  async function del(mid: number) {
    if (!confirm('Supprimer ce message ?')) return;
    try { await chat.deleteMsg(mid); load(); } catch (e) { setError((e as Error).message); }
  }
  async function star() {
    if (!d) return;
    await chat.patch(id, { important: !d.important });
    load();
  }

  if (!d) return <div className="conv"><div className="empty">{error || 'Chargement…'}</div></div>;
  const members: { id: number; nom: string }[] = d.type === 'membre' && d.membre ? [{ id: d.membre.id, nom: d.membre.nom }]
    : d.participants.filter((p: Row) => p.kind === 'member').map((p: Row) => ({ id: p.id, nom: p.nom }));
  const mine = d.messages.filter((m: Row) => m.author_user_id === meId && !m.deleted_at);
  const lastMine = mine[mine.length - 1];
  const seenBy = lastMine ? d.lectures.filter((l: Row) => new Date(l.last_read_at) >= new Date(lastMine.created_at)).map((l: Row) => l.nom) : [];

  return (
    <div className={`conv${over ? ' drop' : ''}`}
      onDragOver={e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setOver(true); } }}
      onDragLeave={e => { if (e.currentTarget === e.target) setOver(false); }}
      onDrop={e => { e.preventDefault(); setOver(false); if (e.dataTransfer.files.length) setDrop([...e.dataTransfer.files]); }}>
      <header className="conv-h">
        {onBack && <button className="tb-btn conv-back" title="Conversations" aria-label="Retour aux conversations" onClick={onBack}><Icon name="back" size={20} /></button>}
        <ThreadAvatar t={d} meId={meId} size={compact ? 32 : 40} />
        <div className="grow conv-title">
          <b>{d.titre}</b>
          <span className="small muted">{subtitle(d, meId)}</span>
        </div>
        {!compact && <button className="tb-btn" title={d.important ? 'Retirer des importants' : 'Marquer comme important'} aria-pressed={d.important} onClick={star}><Icon name="fav" size={20} fill={d.important} /></button>}
        {onToggleInfo && <button className="tb-btn" title="Informations" aria-pressed={infoOpen} onClick={onToggleInfo}><Icon name="info" size={20} /></button>}
        {compact && <Link className="tb-btn" href={`/messagerie?c=${id}`} title="Ouvrir dans la messagerie"><Icon name="open" size={18} /></Link>}
        {onMinimize && <button className="tb-btn" title="Réduire" onClick={onMinimize}><Icon name="minimize" size={18} /></button>}
        {onClose && <button className="tb-btn" title="Fermer" onClick={onClose}><Icon name="close" size={18} /></button>}
      </header>
      {error && <div className="err" style={{ margin: 8 }}>{error}</div>}
      <div className="conv-body" ref={scroller}>
        {!compact && <ProfileCard d={d} meId={meId} />}
        {d.messages.length === 0 && <p className="small muted" style={{ textAlign: 'center', padding: 16 }}>Écrivez le premier message.</p>}
        {d.messages.map((m: Row, i: number) => {
          const prev = d.messages[i - 1], next = d.messages[i + 1];
          const same = (x: Row, y: Row) => x && y && x.auteur === y.auteur && x.de_nous === y.de_nous && x.author_user_id === y.author_user_id
            && new Date(x.created_at).toDateString() === new Date(y.created_at).toDateString()
            && Math.abs(new Date(y.created_at).getTime() - new Date(x.created_at).getTime()) < 5 * 60000;
          const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
          const cont = !newDay && same(prev, m), last = !same(m, next);
          const own = m.author_user_id === meId;
          const big = !m.deleted_at && onlyEmoji(m.texte) && !m.fichiers.length;
          const open = pop?.mid === m.id;
          return (
            <Fragment key={m.id}>
              {newDay && <div className="day-sep"><span>{dayLabel(m.created_at)}</span></div>}
              <div id={`m-${m.id}`} className={`bubble-row ${own ? 'own' : 'them'}${cont ? ' cont' : ''}${last ? ' last' : ''}`}>
                {!own && <div className="b-av">{last && (m.auteur_kind ? <Avatar kind={m.auteur_kind} id={m.auteur_id} size={28} /> : <img className="avatar" src="/logo-app.png" alt="" width={28} height={28} />)}</div>}
                <div className="b-col">
                  {!own && !cont && <div className="b-name">{m.auteur}{m.author_member_id && <span className="tag-in"><Icon name="inbound" size={11} /> notée par l’équipe</span>}</div>}
                  {m.forwarded && !m.deleted_at && <div className="b-fwd"><Icon name="send" size={12} /> Transféré</div>}
                  {m.reponse_a && !m.deleted_at && (
                    <button className="b-quote" onClick={() => goTo(m.reponse_a.id)} title="Voir le message d’origine">
                      <small><Icon name="inbound" size={11} /> {own ? 'Vous avez répondu à' : 'A répondu à'} {m.reponse_a.auteur}</small>
                      <span>{m.reponse_a.supprime ? 'Message supprimé' : m.reponse_a.texte || `📎 ${m.reponse_a.fichiers} pièce(s) jointe(s)`}</span>
                    </button>
                  )}
                  {editing?.id === m.id ? (
                    <div className="msg-edit">
                      <textarea className="inp" value={editing?.texte ?? ''} autoFocus onChange={e => { const texte = e.target.value; setEditing(ed => ed && { ...ed, texte }); }}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); } if (e.key === 'Escape') setEditing(null); }} />
                      <div className="row"><button className="btn sm" onClick={() => setEditing(null)}>Annuler</button><button className="btn cta sm" onClick={saveEdit}>Enregistrer</button></div>
                    </div>
                  ) : (
                    <div className="b-line">
                      {(m.deleted_at || m.texte) && (
                        <div className={`bubble${big ? ' emoji' : ''}${m.deleted_at ? ' deleted' : ''}`} title={new Date(m.created_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}>
                          {m.deleted_at ? (own ? 'Vous avez supprimé un message' : 'Message supprimé') : linkify(m.texte)}
                          {m.edited_at && !m.deleted_at && <span className="b-edited"> · modifié</span>}
                        </div>
                      )}
                      {!m.deleted_at && (
                        <div className={`b-actions${open ? ' open' : ''}`}>
                          <span className="pop-anchor">
                            <button className="tb-btn" title="Réagir" aria-label="Réagir" aria-expanded={open && pop?.kind === 'react'} onClick={() => setPop(open && pop?.kind === 'react' ? null : { mid: m.id, kind: 'react' })}><Icon name="smile" size={16} /></button>
                            {open && pop?.kind === 'react' && <div className="react-pop pop">{REACTIONS.map(r => <button key={r} title={r} onClick={() => react(m.id, r)}>{r}</button>)}</div>}
                          </span>
                          <button className="tb-btn" title="Répondre" aria-label="Répondre" onClick={() => { setPop(null); setReply(m); }}><Icon name="inbound" size={16} /></button>
                          <span className="pop-anchor">
                            <button className="tb-btn" title="Plus" aria-label="Plus d’actions" aria-expanded={open && pop?.kind === 'more'} onClick={() => setPop(open && pop?.kind === 'more' ? null : { mid: m.id, kind: 'more' })}><Icon name="more" size={16} /></button>
                            {open && pop?.kind === 'more' && (
                              <div className="menu-pop pop">
                                {own && m.texte && <button onClick={() => { setPop(null); setEditing({ id: m.id, texte: m.texte }); }}><Icon name="edit" size={16} /> Modifier</button>}
                                <button onClick={() => { setPop(null); setReply(m); }}><Icon name="inbound" size={16} /> Répondre</button>
                                {m.texte && <button onClick={() => copy(m.texte)}><Icon name="doc" size={16} /> Copier le texte</button>}
                                <button onClick={() => { setPop(null); setFwd(m); }}><Icon name="send" size={16} /> Transférer</button>
                                {own && <button className="danger" onClick={() => { setPop(null); del(m.id); }}><Icon name="trash" size={16} /> Supprimer</button>}
                              </div>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {!m.deleted_at && <Files files={m.fichiers} />}
                  {m.reactions.length > 0 && (
                    <div className="b-reacts">
                      {m.reactions.map((r: Row) => (
                        <button key={r.emoji} className={`b-react${r.moi ? ' mine' : ''}`} title={r.noms} onClick={() => react(m.id, r.emoji)}>{r.emoji}{r.n > 1 && <span>{r.n}</span>}</button>
                      ))}
                    </div>
                  )}
                  {last && <span className="b-time">{hm(m.created_at)}</span>}
                </div>
              </div>
              {m === lastMine && seenBy.length > 0 && <div className="seen">Vu par {seenBy.join(', ')}</div>}
            </Fragment>
          );
        })}
      </div>
      {members.length > 0 && !compact && <p className="conv-note small muted"><Icon name="mail" size={14} /> Les membres n’ont pas de compte : vos messages leur sont envoyés par courriel.</p>}
      <Composer compact={compact} onSend={send} members={members} incoming={drop} autoFocus={!compact}
        reply={reply ? { auteur: reply.author_user_id === meId ? 'vous-même' : reply.auteur, texte: reply.texte } : null} onCancelReply={() => setReply(null)} />
      {fwd && <ForwardModal msg={fwd} from={id} onClose={() => setFwd(null)} />}
      {over && <div className="drop-hint">Déposez les fichiers pour les joindre</div>}
    </div>
  );
}

function Files({ files }: { files: Row[] }) {
  if (!files?.length) return null;
  const src = (f: Row) => `/api/messagerie/fichiers/${f.id}`;
  return (
    <div className="msg-files">
      {files.map(f => f.type.startsWith('image/') ? (
        <a key={f.id} href={src(f)} target="_blank" rel="noreferrer" className="msg-img"><img src={src(f)} alt={f.nom} loading="lazy" /></a>
      ) : f.type.startsWith('video/') ? (
        <video key={f.id} className="msg-video" src={src(f)} controls preload="metadata" />
      ) : f.type.startsWith('audio/') ? (
        <audio key={f.id} src={src(f)} controls preload="metadata" />
      ) : (
        <a key={f.id} href={`${src(f)}?dl=1`} className="msg-file"><Icon name="doc" size={22} /><span className="grow"><b>{f.nom}</b><span className="small muted">{size(f.taille)}</span></span><Icon name="download" size={16} /></a>
      ))}
    </div>
  );
}

// Carte de présentation en haut de la conversation (comme sur LinkedIn)
function ProfileCard({ d, meId }: { d: Row; meId: number }) {
  if (d.type === 'membre' && d.membre) return (
    <div className="profile-card">
      <Avatar kind="member" id={d.membre.id} size={72} />
      <div><b className="pc-name">{d.membre.nom}</b><p className="small">{d.membre.description || [d.membre.secteur, d.membre.ville].filter(Boolean).join(' · ')}</p>
        <Link className="small" href={`/membres/${d.membre.id}`}>Voir la fiche du membre</Link></div>
    </div>
  );
  const others = d.participants.filter((p: Row) => !(p.kind === 'user' && p.id === meId));
  if (d.type === 'equipe' && others[0]) return (
    <div className="profile-card">
      <Avatar kind="user" id={others[0].id} size={72} />
      <div><b className="pc-name">{others[0].nom}</b><p className="small">{others[0].fonction || others[0].role}</p></div>
    </div>
  );
  return (
    <div className="profile-card">
      <div className="pc-stack">{d.participants.slice(0, 5).map((p: Row) => <Avatar key={p.kind + p.id} kind={p.kind} id={p.id} size={40} />)}</div>
      <div><b className="pc-name">{d.titre}</b><p className="small">{d.participants.map((p: Row) => p.nom).join(', ')}</p></div>
    </div>
  );
}

// Transférer un message : choix de la conversation de destination
function ForwardModal({ msg, from, onClose }: { msg: Row; from: number; onClose: () => void }) {
  const [term, setTerm] = useState('');
  const [list, setList] = useState<Thread[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  useEffect(() => {
    const t = setTimeout(() => chat.list('tous', term).then(l => setList(l.filter(x => x.id !== from))).catch(() => setList([])), 200);
    return () => clearTimeout(t);
  }, [term, from]);

  async function send(t: Thread) {
    setBusy(t.id);
    try { await chat.forward(msg.id, t.id); chatChanged(); toast(`Message transféré à ${t.titre}.`); onClose(); }
    catch (e) { toast((e as Error).message, 'error'); setBusy(null); }
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="modal" role="dialog" aria-label="Transférer le message">
        <div className="modal-h"><div><h2>Transférer</h2><span className="small muted">« {(msg.texte || 'Pièce jointe').slice(0, 80)} »</span></div>
          <button type="button" className="btn sm ghost" onClick={onClose} aria-label="Fermer">✕</button></div>
        <div className="modal-b">
          <label className="inbox-search" style={{ maxWidth: 'none' }}><Icon name="search" size={16} />
            <input autoFocus placeholder="Rechercher une conversation" value={term} onChange={e => setTerm(e.target.value)} aria-label="Rechercher une conversation" /></label>
          <ul className="fwd-list">
            {list === null && <li className="small muted">Chargement…</li>}
            {list?.length === 0 && <li className="small muted">Aucune autre conversation.</li>}
            {list?.map(t => (
              <li key={t.id}><ThreadAvatar t={t} size={36} /><b className="grow">{t.titre}</b>
                <button className="btn sm" disabled={busy !== null} onClick={() => send(t)}>{busy === t.id ? 'Envoi…' : 'Envoyer'}</button></li>
            ))}
          </ul>
        </div>
      </div>
    </ModalBackdrop>
  );
}
