'use client';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import type { Person } from '@/lib/chat';
import { relative } from '@/lib/format';
import { estMoi, fromStored, toStored, type Auteur, type Comment, type Me } from '@/lib/news-client';
import { toast } from '@/lib/toast';
import Avatar from '../Avatar';
import Icon from '../Icon';
import MentionInput, { type MentionInputHandle } from './MentionInput';
import { ReactButton, ReactionSummary } from './Reactions';
import RichText from './RichText';
import { useNewsCtx } from './contexte';

// Avatar d'un auteur : photo du collègue, ou logo de l'entreprise du membre
const Portrait = ({ a, size }: { a: Auteur | Me | null; size: number }) => a?.kind === 'contact' && a.member_id
  ? <Avatar kind="member" id={a.member_id} size={size} /> : <Avatar kind="user" id={a?.id ?? 0} size={size} />;
const when = (d: string) => relative(d) ?? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const fail = (e: unknown) => toast((e as Error).message, 'error');

// Zone de saisie d'un commentaire (ou d'une réponse), avec mentions
const Composer = forwardRef<MentionInputHandle, { me: Me; start?: { text: string; mentions: Person[] }; placeholder: string; onSend: (stored: string) => Promise<unknown>; autoFocus?: boolean }>(
  function Composer({ me, start, placeholder, onSend, autoFocus }, ref) {
    const [text, setText] = useState(start?.text ?? '');
    const [mentions, setMentions] = useState<Person[]>(start?.mentions ?? []);
    const [busy, setBusy] = useState(false);
    const { espace } = useNewsCtx();
    async function submit() {
      if (!text.trim() || busy) return;
      setBusy(true);
      try { await onSend(toStored(text.trim(), mentions)); setText(''); setMentions([]); } catch (e) { fail(e); } finally { setBusy(false); }
    }
    return (
      <div className="cm-compose">
        <Portrait a={me} size={32} />
        <div className="cm-input">
          <MentionInput ref={ref} value={text} onChange={setText} mentions={mentions} onMentions={setMentions} onSubmit={submit}
            placeholder={placeholder} label={placeholder} autoFocus={autoFocus} className="cm-ta" sansMention={espace} />
          <button type="button" className="tb-btn" aria-label="Envoyer" title="Envoyer (Entrée)" disabled={!text.trim() || busy} onClick={submit}><Icon name="send" size={18} /></button>
        </div>
      </div>
    );
  });

function Item({ c, me, proprio, replies, newsId, onChanged, highlight }: { c: Comment; me: Me; proprio?: boolean; replies?: Comment[]; newsId: number; onChanged: () => void; highlight: number | null }) {
  const { api, espace } = useNewsCtx();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => fromStored(c.texte));
  const [reply, setReply] = useState<{ text: string; mentions: Person[] } | null>(null);
  const mine = estMoi(c.auteur, me);

  async function save() {
    try { await api.editComment(c.id, toStored(draft.text.trim(), draft.mentions)); setEditing(false); onChanged(); } catch (e) { fail(e); }
  }
  async function remove() {
    if (!confirm(replies?.length ? 'Supprimer ce commentaire et ses réponses ?' : 'Supprimer ce commentaire ?')) return;
    try { await api.deleteComment(c.id); onChanged(); } catch (e) { fail(e); }
  }
  // Répondre : la réponse commence par une mention de l'auteur (sauf soi-même)
  function answer(to: Comment) {
    const a = to.auteur;
    // Mention d'un collègue (côté équipe) ; un membre, ou depuis l'espace membre : son nom en clair
    if (!a || estMoi(a, me)) setReply({ text: '', mentions: [] });
    else if (!espace && (a.kind ?? 'user') === 'user' && a.id) setReply({ text: `@${a.nom} `, mentions: [{ kind: 'user', id: a.id, nom: a.nom }] });
    else setReply({ text: `${a.nom.split(' ')[0]}, `, mentions: [] });
  }

  return (
    <div className={`cm${highlight === c.id ? ' flash' : ''}`} id={`c-${c.id}`}>
      <Portrait a={c.auteur} size={c.parent_id ? 28 : 34} />
      <div className="cm-col">
        {editing ? (
          <div className="cm-edit">
            <MentionInput value={draft.text} onChange={t => setDraft(d => ({ ...d, text: t }))} mentions={draft.mentions} onMentions={m => setDraft(d => ({ ...d, mentions: m }))}
              onSubmit={save} label="Modifier le commentaire" autoFocus className="cm-ta" sansMention={espace} />
            <span className="small muted">Entrée pour enregistrer · <button type="button" className="linkish" onClick={() => { setEditing(false); setDraft(fromStored(c.texte)); }}>Annuler</button></span>
          </div>
        ) : (
          <div className="cm-bubble">
            <b>{c.auteur?.nom ?? 'Ancien compte'}{c.auteur?.kind === 'contact' && c.auteur.entreprise && <span className="cm-ent"> · {c.auteur.entreprise}</span>}</b>
            <p><RichText text={c.texte} /></p>
            <ReactionSummary reactions={c.reactions} compact />
          </div>
        )}
        {!editing && (
          <div className="cm-meta">
            <time dateTime={c.created_at} title={new Date(c.created_at).toLocaleString('fr-FR')}>{when(c.created_at)}</time>
            <ReactButton small reactions={c.reactions} onReact={e => api.reactComment(c.id, e).then(onChanged, fail)} />
            <button type="button" className="cm-act" onClick={() => answer(c)}>Répondre</button>
            {mine && <button type="button" className="cm-act" onClick={() => setEditing(true)}>Modifier</button>}
            {(mine || me.role === 'Administrateur' || proprio) && <button type="button" className="cm-act danger" onClick={remove}>Supprimer</button>}
            {c.edited_at && <span className="muted">· modifié</span>}
          </div>
        )}
        {replies && replies.length > 0 && (
          <div className="cm-replies">
            {replies.map(r => <Item key={r.id} c={r} me={me} proprio={proprio} newsId={newsId} onChanged={onChanged} highlight={highlight} />)}
          </div>
        )}
        {reply && (
          <Composer me={me} start={reply} placeholder={`Répondre à ${c.auteur?.nom ?? 'ce commentaire'}…`} autoFocus
            onSend={async t => { await api.comment(newsId, t, c.id); setReply(null); onChanged(); }} />
        )}
      </div>
    </div>
  );
}

export type CommentsHandle = { focus: () => void };

// Commentaires d'une actualité : principaux, puis leurs réponses en retrait ; saisie en bas
// proprio : le lecteur (membre) est l'auteur de la publication et peut retirer les commentaires dessous
const Comments = forwardRef<CommentsHandle, { newsId: number; comments: Comment[]; me: Me; proprio?: boolean; onChanged: () => void; highlight: number | null }>(
  function Comments({ newsId, comments, me, proprio, onChanged, highlight }, ref) {
    const { api, espace } = useNewsCtx();
    const input = useRef<MentionInputHandle>(null);
    useImperativeHandle(ref, () => ({ focus: () => input.current?.focus() }));
    const top = comments.filter(c => !c.parent_id);
    return (
      <div className="np-comments">
        {top.map(c => <Item key={c.id} c={c} me={me} proprio={proprio} replies={comments.filter(r => r.parent_id === c.id)} newsId={newsId} onChanged={onChanged} highlight={highlight} />)}
        <Composer ref={input} me={me} placeholder={espace ? 'Écrire un commentaire…' : 'Écrire un commentaire… (@ pour mentionner)'} onSend={async t => { await api.comment(newsId, t); onChanged(); }} />
      </div>
    );
  });
export default Comments;
