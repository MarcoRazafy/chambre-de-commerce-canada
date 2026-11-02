'use client';
import { useEffect, useRef, useState } from 'react';
import { EMOJIS, size } from '@/lib/chat';
import Icon from '../Icon';

type Props = {
  onSend: (texte: string, files: File[], entrant: number | null) => Promise<void>;
  members?: { id: number; nom: string }[];   // membres de la conversation (pour noter une réponse reçue)
  incoming?: File[];                           // fichiers déposés sur la conversation
  compact?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
};

// Zone de rédaction : Entrée envoie, Maj+Entrée va à la ligne ; images, vidéos, fichiers (bouton, glisser-déposer, coller), émojis
export default function Composer({ onSend, members = [], incoming, compact, autoFocus, placeholder }: Props) {
  const [texte, setTexte] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [entrant, setEntrant] = useState<number | null>(null);
  const [emoji, setEmoji] = useState(false);
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const area = useRef<HTMLTextAreaElement>(null);
  const pick = useRef<HTMLInputElement>(null);

  useEffect(() => { if (incoming?.length) setFiles(f => [...f, ...incoming]); }, [incoming]);
  useEffect(() => {   // hauteur automatique
    const a = area.current;
    if (a) { a.style.height = 'auto'; a.style.height = Math.min(a.scrollHeight, compact ? 120 : 200) + 'px'; }
  }, [texte, compact]);

  function choose(accept: string) {
    if (!pick.current) return;
    pick.current.accept = accept;
    pick.current.click();
  }

  async function send() {
    if (busy || (!texte.trim() && !files.length)) return;
    setBusy(true);
    setError('');
    try {
      await onSend(texte, files, entrant);
      setTexte('');
      setFiles([]);
      setEntrant(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      area.current?.focus();
    }
  }

  const insert = (e: string) => {
    const a = area.current, at = a?.selectionStart ?? texte.length;
    setTexte(texte.slice(0, at) + e + texte.slice(at));
    setEmoji(false);
    setTimeout(() => { a?.focus(); a?.setSelectionRange(at + e.length, at + e.length); });
  };
  const who = members.find(m => m.id === entrant);

  return (
    <div className={`composer2${compact ? ' compact' : ''}${entrant ? ' inbound' : ''}`}>
      {who && (
        <div className="inbound-bar">
          <Icon name="inbound" size={14} /> Réponse reçue de <b>{who.nom}</b>, notée par vous
          <button type="button" className="btn ghost sm" onClick={() => setEntrant(null)}>Annuler</button>
        </div>
      )}
      {error && <div className="err">{error}</div>}
      {files.length > 0 && (
        <div className="pending">
          {files.map((f, i) => (
            <span key={i} className="pending-f">
              {f.type.startsWith('image/') ? <img src={URL.createObjectURL(f)} alt="" /> : <Icon name={f.type.startsWith('video/') ? 'video' : 'doc'} size={18} />}
              <span className="grow"><b>{f.name}</b><span className="small muted">{size(f.size)}</span></span>
              <button type="button" aria-label={`Retirer ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))}><Icon name="close" size={14} /></button>
            </span>
          ))}
        </div>
      )}
      <textarea ref={area} rows={compact ? 1 : 3} value={texte} autoFocus={autoFocus} aria-label="Votre message"
        placeholder={placeholder ?? (who ? `Ce que ${who.nom} a répondu…` : 'Rédigez un message…')}
        onChange={e => setTexte(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
        onPaste={e => { const imgs = [...e.clipboardData.files]; if (imgs.length) { e.preventDefault(); setFiles(f => [...f, ...imgs]); } }} />
      <div className="composer-bar">
        <button type="button" className="tb-btn" title="Image" aria-label="Joindre une image" onClick={() => choose('image/*')}><Icon name="image" size={20} /></button>
        <button type="button" className="tb-btn" title="Vidéo" aria-label="Joindre une vidéo" onClick={() => choose('video/*')}><Icon name="video" size={20} /></button>
        <button type="button" className="tb-btn" title="Fichier" aria-label="Joindre un fichier" onClick={() => choose('')}><Icon name="attach" size={20} /></button>
        <span className="pop-anchor">
          <button type="button" className="tb-btn" title="Émojis" aria-label="Insérer un émoji" aria-expanded={emoji} onClick={() => setEmoji(v => !v)}><Icon name="smile" size={20} /></button>
          {emoji && <div className="emoji-pop pop" role="dialog" aria-label="Émojis">{EMOJIS.map(e => <button key={e} type="button" onClick={() => insert(e)}>{e}</button>)}</div>}
        </span>
        <span className="grow" />
        {members.length > 0 && (
          <span className="pop-anchor">
            <button type="button" className="tb-btn" title="Plus" aria-label="Plus d’options" aria-expanded={menu} onClick={() => setMenu(v => !v)}><Icon name="more" size={20} /></button>
            {menu && (
              <div className="menu-pop pop up">
                {members.map(m => (
                  <button key={m.id} type="button" onClick={() => { setEntrant(m.id); setMenu(false); area.current?.focus(); }}>
                    <Icon name="inbound" size={16} /> Noter une réponse reçue de {m.nom}
                  </button>
                ))}
              </div>
            )}
          </span>
        )}
        <button type="button" className="btn cta sm" disabled={busy || (!texte.trim() && !files.length)} onClick={send}>{busy ? 'Envoi…' : entrant ? 'Noter' : 'Envoyer'}</button>
      </div>
      <input ref={pick} type="file" multiple hidden onChange={e => { setFiles(f => [...f, ...(e.target.files ? [...e.target.files] : [])]); e.target.value = ''; }} />
    </div>
  );
}
