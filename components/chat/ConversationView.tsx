'use client';
import Link from 'next/link';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import type { Row } from '@/lib/format';
import { chat, chatChanged, dayLabel, hm, size } from '@/lib/chat';
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

export default function ConversationView({ id, meId, compact, infoOpen, onToggleInfo, onClose, onMinimize, onData }: Props) {
  const [d, setD] = useState<Row | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<{ id: number; texte: string } | null>(null);
  const [drop, setDrop] = useState<File[] | undefined>();
  const [over, setOver] = useState(false);
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

  async function send(texte: string, files: File[], entrant: number | null) {
    await chat.send(id, texte, files, entrant);
    await load();
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
          const prev = d.messages[i - 1];
          const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
          const grouped = !newDay && prev && prev.auteur === m.auteur && prev.de_nous === m.de_nous && new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60000;
          const own = m.author_user_id === meId;
          return (
            <Fragment key={m.id}>
              {newDay && <div className="day-sep"><span>{dayLabel(m.created_at)}</span></div>}
              <div className={`msg-row${grouped ? ' grouped' : ''}${own ? ' own' : ''}`}>
                <div className="msg-av">{!grouped && (m.auteur_kind ? <Avatar kind={m.auteur_kind} id={m.auteur_id} size={compact ? 28 : 36} /> : <img className="avatar" src="/logo-app.png" alt="" width={compact ? 28 : 36} height={compact ? 28 : 36} />)}</div>
                <div className="msg-main">
                  {!grouped && (
                    <div className="msg-meta"><b>{m.auteur}</b><span className="muted">{hm(m.created_at)}</span>
                      {!m.de_nous && <span className="tag-in"><Icon name="inbound" size={12} /> réponse reçue, notée par l’équipe</span>}</div>
                  )}
                  {m.deleted_at ? <p className="msg-txt deleted">Message supprimé</p> : editing?.id === m.id ? (
                    <div className="msg-edit">
                      <textarea className="inp" value={editing?.texte ?? ''} autoFocus onChange={e => { const texte = e.target.value; setEditing(ed => ed && { ...ed, texte }); }}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); } if (e.key === 'Escape') setEditing(null); }} />
                      <div className="row"><button className="btn sm" onClick={() => setEditing(null)}>Annuler</button><button className="btn cta sm" onClick={saveEdit}>Enregistrer</button></div>
                    </div>
                  ) : (
                    <>
                      {m.texte && <p className="msg-txt">{linkify(m.texte)}{m.edited_at && <span className="muted small"> (modifié)</span>}</p>}
                      <Files files={m.fichiers} />
                    </>
                  )}
                </div>
                {own && !m.deleted_at && editing?.id !== m.id && (
                  <div className="msg-actions">
                    <button className="tb-btn" title="Modifier" onClick={() => setEditing({ id: m.id, texte: m.texte })}><Icon name="edit" size={16} /></button>
                    <button className="tb-btn" title="Supprimer" onClick={() => del(m.id)}><Icon name="trash" size={16} /></button>
                  </div>
                )}
              </div>
              {m === lastMine && seenBy.length > 0 && <div className="seen">Vu par {seenBy.join(', ')}</div>}
            </Fragment>
          );
        })}
      </div>
      {members.length > 0 && !compact && <p className="conv-note small muted"><Icon name="mail" size={14} /> Les membres n’ont pas de compte : vos messages leur sont envoyés par courriel.</p>}
      <Composer compact={compact} onSend={send} members={members} incoming={drop} autoFocus={!compact} />
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
