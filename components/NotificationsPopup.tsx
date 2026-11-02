'use client';
import { useEffect, useState } from 'react';
import { api, type Row } from '@/lib/format';
import { runAction } from '@/lib/ui-actions';

const when = (d: string) => new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// Fenêtre ouverte depuis la cloche : 30 dernières notifications, clic = lue
export default function NotificationsPopup({ onChange }: { onChange: () => void }) {
  const [list, setList] = useState<Row[] | null>(null);
  const [error, setError] = useState('');

  const load = () => api<Row[]>('/api/notifications').then(l => setList(l.slice(0, 30))).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);

  async function read(n: Row) {
    if (n.lu) return;
    setList(l => l?.map(x => (x.id === n.id ? { ...x, lu: true } : x)) ?? null);
    await api(`/api/notifications/${n.id}`, 'PATCH', { lu: true }).catch(e => setError(e.message));
    onChange();
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
              <button className={`notif-i${n.lu ? '' : ' unread'}`} onClick={() => read(n)}>
                <span className="notif-dot" aria-hidden="true" />
                <span className="grow"><span className="notif-t">{n.texte}</span><span className="small muted">{when(n.created_at)}{n.lu ? '' : ' · non lue'}</span></span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
