'use client';
import { useRef, useState } from 'react';
import { REACTIONS } from '@/lib/chat';
import type { Reaction } from '@/lib/news-client';
import Icon from '../Icon';

const LABEL: Record<string, string> = { '👍': 'J’aime', '❤️': 'J’adore', '😂': 'Haha', '😮': 'Wouah', '😢': 'Triste', '🙏': 'Merci' };

// Bouton « J'aime » façon Facebook : un clic met 👍 (ou retire sa réaction) ; survol ou appui long ouvre les autres réactions
export function ReactButton({ reactions, onReact, small }: { reactions: Reaction[]; onReact: (emoji: string) => void; small?: boolean }) {
  const mine = reactions.find(r => r.moi)?.emoji ?? null;
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const longPress = useRef(false);
  const later = (fn: () => void, ms: number) => { clearTimeout(timer.current); timer.current = setTimeout(fn, ms); };
  const choose = (e: string) => { setOpen(false); onReact(e); };

  return (
    <span className="react-wrap" onMouseEnter={() => later(() => setOpen(true), 450)} onMouseLeave={() => later(() => setOpen(false), 300)}>
      <button type="button" className={`${small ? 'cm-act' : 'np-act'}${mine ? ' on' : ''}`} aria-pressed={!!mine}
        onTouchStart={() => { longPress.current = false; later(() => { longPress.current = true; setOpen(true); }, 500); }}
        onTouchEnd={() => clearTimeout(timer.current)}
        onClick={() => { if (longPress.current) { longPress.current = false; return; } setOpen(false); onReact(mine ?? '👍'); }}>
        {!small && (mine ? <span className="np-emoji">{mine}</span> : <Icon name="like" size={18} />)}
        {mine ? LABEL[mine] ?? 'Réagi' : 'J’aime'}
      </button>
      {open && (
        <span className="react-bar pop" role="menu" aria-label="Réactions">
          {REACTIONS.map(e => <button key={e} type="button" role="menuitem" title={LABEL[e]} aria-label={LABEL[e]} className={e === mine ? 'on' : ''} onClick={() => choose(e)}>{e}</button>)}
        </span>
      )}
    </span>
  );
}

// Résumé : les 3 émojis les plus donnés et le total ; le détail des noms au survol
export function ReactionSummary({ reactions, compact }: { reactions: Reaction[]; compact?: boolean }) {
  const total = reactions.reduce((a, r) => a + r.n, 0);
  if (!total) return null;
  const title = reactions.map(r => `${r.emoji} ${r.noms}`).join('\n');
  return (
    <span className={compact ? 'cm-reacts' : 'np-reacts'} title={title}>
      <span className="np-emojis">{reactions.slice(0, 3).map(r => <span key={r.emoji}>{r.emoji}</span>)}</span>
      {total}
    </span>
  );
}
