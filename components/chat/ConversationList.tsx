'use client';
import { preview, shortDate, type Thread } from '@/lib/chat';
import { ThreadAvatar } from '../Avatar';
import Icon from '../Icon';

// Liste des conversations : avatar, nom, date, aperçu ; en gras et avec un point bleu si non lue
export default function ConversationList({ threads, active, meId, onSelect, compact }: { threads: Thread[] | null; active?: number | null; meId: number; onSelect: (id: number) => void; compact?: boolean }) {
  if (threads === null) return <div className="empty">Chargement…</div>;
  if (!threads.length) return <div className="empty">Aucune conversation.</div>;
  return (
    <ul className={`conv-list${compact ? ' compact' : ''}`}>
      {threads.map(t => (
        <li key={t.id}>
          <button className={`conv-item${t.id === active ? ' on' : ''}${t.non_lu ? ' unread' : ''}`} onClick={() => onSelect(t.id)} aria-current={t.id === active ? 'true' : undefined}>
            <ThreadAvatar t={t} meId={meId} size={compact ? 40 : 48} />
            <span className="grow ci-text">
              <span className="ci-top"><b>{t.titre}</b><span className="ci-date">{shortDate(t.dernier_at ?? t.maj)}</span></span>
              {!compact && t.type === 'membre' && t.sujet && <span className="ci-sub">{t.sujet}</span>}
              <span className="ci-prev">{t.important && <Icon name="fav" size={12} fill />}{preview(t, meId)}</span>
            </span>
            {t.non_lu && <span className="ci-dot" aria-label="Non lue" />}
          </button>
        </li>
      ))}
    </ul>
  );
}
