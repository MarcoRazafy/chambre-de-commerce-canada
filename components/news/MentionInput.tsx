'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { chat, type Person } from '@/lib/chat';
import Avatar from '../Avatar';

type Props = {
  value: string; onChange: (v: string) => void;
  mentions: Person[]; onMentions: (m: Person[]) => void;
  placeholder?: string; rows?: number; autoFocus?: boolean; className?: string;
  onSubmit?: () => void;   // Entrée envoie (commentaires) ; Maj + Entrée va à la ligne
  label: string;
};
export type MentionInputHandle = { focus: () => void };

// Zone de texte avec « @ » : en tapant @ et le début d'un nom, une liste de collègues et de membres s'ouvre
const MentionInput = forwardRef<MentionInputHandle, Props>(function MentionInput(p, ref) {
  const ta = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [found, setFound] = useState<Person[]>([]);
  const [sel, setSel] = useState(0);
  useImperativeHandle(ref, () => ({ focus: () => { ta.current?.focus(); const n = ta.current?.value.length ?? 0; ta.current?.setSelectionRange(n, n); } }));

  useEffect(() => {
    if (query === null) return;
    const t = setTimeout(() => chat.people(query).then(r => { setFound(r.slice(0, 8)); setSel(0); }).catch(() => setFound([])), 150);
    return () => clearTimeout(t);
  }, [query]);

  // Grandit avec le texte
  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 320) + 'px';
  }, [p.value]);

  function detect(el: HTMLTextAreaElement) {
    const before = el.value.slice(0, el.selectionStart);
    const m = before.match(/(^|\s)@([\p{L}\d'’ -]{0,30})$/u);
    setQuery(m && !m[2].includes('  ') ? m[2] : null);
  }

  function pick(person: Person) {
    const el = ta.current!;
    const caret = el.selectionStart;
    const before = el.value.slice(0, caret).replace(/@([\p{L}\d'’ -]{0,30})$/u, `@${person.nom} `);
    p.onChange(before + el.value.slice(caret));
    if (!p.mentions.some(m => m.kind === person.kind && m.id === person.id)) p.onMentions([...p.mentions, person]);
    setQuery(null);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(before.length, before.length); });
  }

  return (
    <div className="mention-box">
      <textarea ref={ta} className={p.className ?? 'inp'} rows={p.rows ?? 1} value={p.value} placeholder={p.placeholder} autoFocus={p.autoFocus}
        aria-label={p.label} aria-autocomplete="list" aria-expanded={query !== null && found.length > 0}
        onChange={e => { p.onChange(e.target.value); detect(e.target); }}
        onClick={e => detect(e.currentTarget)}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
        onKeyDown={e => {
          if (query !== null && found.length) {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => (s + 1) % found.length); return; }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => (s - 1 + found.length) % found.length); return; }
            if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(found[sel]); return; }
            if (e.key === 'Escape') { setQuery(null); return; }
          }
          if (e.key === 'Enter' && !e.shiftKey && p.onSubmit) { e.preventDefault(); p.onSubmit(); }
        }} />
      {query !== null && found.length > 0 && (
        <ul className="mention-list" role="listbox">
          {found.map((f, i) => (
            <li key={f.kind + f.id} role="option" aria-selected={i === sel}>
              <button type="button" className={i === sel ? 'on' : ''} onMouseDown={e => { e.preventDefault(); pick(f); }}>
                <Avatar kind={f.kind} id={f.id} size={28} />
                <span><b>{f.nom}</b><small>{f.kind === 'user' ? 'Équipe' : 'Membre'}{f.detail ? ' · ' + f.detail : ''}</small></span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
export default MentionInput;
