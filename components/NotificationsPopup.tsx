'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, type Row } from '@/lib/format';
import { runAction } from '@/lib/ui-actions';
import Avatar from './Avatar';
import Icon from './Icon';

// Icône du type d'événement (enregistrée avec la notification, sinon devinée d'après le texte pour les anciennes)
const iconOf = (n: Row): string => n.icone ?? (
  /^Relance|^Rappel/.test(n.texte) ? 'mail' : /retard/.test(n.texte) ? 'alert' : /^Règlement|paiement|payée/i.test(n.texte) ? 'coin'
  : /demande d’adhésion/.test(n.texte) ? 'userplus' : /mentionné/.test(n.texte) ? 'chat' : /actualité/i.test(n.texte) ? 'news'
  : /événement|inscri/i.test(n.texte) ? 'cal' : 'bell');

const when = (d: string) => new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// Fenêtre ouverte depuis la cloche : 30 dernières notifications. Un clic la marque lue et ouvre la page liée.
export default function NotificationsPopup({ onChange, onClose }: { onChange: () => void; onClose: () => void }) {
  const router = useRouter();
  const [list, setList] = useState<Row[] | null>(null);
  const [error, setError] = useState('');

  const load = () => api<Row[]>('/api/notifications').then(l => setList(l.slice(0, 30))).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);

  async function open(n: Row) {
    if (!n.lu) {
      setList(l => l?.map(x => (x.id === n.id ? { ...x, lu: true } : x)) ?? null);
      await api(`/api/notifications/${n.id}`, 'PATCH', { lu: true }).catch(e => setError(e.message));
      onChange();
    }
    if (n.lien) {
      onClose();
      router.push(n.lien);
    }
  }

  async function readAll() {
    try { await runAction('notifications-read', {}); load(); onChange(); } catch (e) { setError((e as Error).message); }
  }

  const unread = list?.filter(n => !n.lu).length ?? 0;
  return (
    <div className="npanel pop notif-pop" role="dialog" aria-label="Notifications">
      <div className="notif-h">
        <b>Notifications</b>
        {unread > 0 && <button className="btn ghost sm" onClick={readAll}>Tout marquer comme lu</button>}
      </div>
      {error && <div className="err" style={{ margin: 12 }}>{error}</div>}
      {list === null ? <div className="empty">Chargement…</div> : list.length === 0 ? <div className="empty">Aucune notification.</div> : (
        <ul className="notif-list">
          {list.map(n => (
            <li key={n.id}>
              <button className={`notif-i${n.lu ? '' : ' unread'}${n.lien ? ' has-link' : ''}`} onClick={() => open(n)}>
                <span className="notif-dot" aria-hidden="true" />
                <span className={`notif-who ic-${iconOf(n)}`} aria-hidden="true">
                  {n.actor_id ? <Avatar kind={n.actor_kind} id={n.actor_id} size={40} /> : <span className="tile-ic notif-tile"><Icon name={iconOf(n)} size={20} fill /></span>}
                  {n.actor_id && <span className="tile-ic notif-badge"><Icon name={iconOf(n)} size={9} fill /></span>}
                </span>
                <span className="grow"><span className="notif-t">{n.texte}</span><span className="small muted">{when(n.created_at)}{n.lu ? '' : ' · non lue'}</span></span>
                {n.lien && <span className="notif-go"><Icon name="down" size={14} /></span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
