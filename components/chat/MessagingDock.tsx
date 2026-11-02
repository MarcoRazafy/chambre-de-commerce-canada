'use client';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { chat, type Thread } from '@/lib/chat';
import Avatar, { ThreadAvatar } from '../Avatar';
import Icon from '../Icon';
import ConversationList from './ConversationList';
import ConversationView from './ConversationView';
import NewConversation from './NewConversation';

type Win = { id: number | 'new'; min: boolean; t?: Thread };

// Messagerie flottante en bas à droite (comme LinkedIn) : liste dépliable + deux mini-conversations au maximum.
// Masquée sur la page Messagerie et sur petit écran.
export default function MessagingDock({ me, unread }: { me: { id: number; nom: string }; unread: number }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [onglet, setOnglet] = useState<'tous' | 'non-lus'>('tous');
  const [term, setTerm] = useState('');
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [wins, setWins] = useState<Win[]>([]);

  useEffect(() => { try { setOpen(localStorage.getItem('cc:dock') === 'ouvert'); } catch {} }, []);
  const toggle = () => setOpen(o => { try { localStorage.setItem('cc:dock', o ? 'ferme' : 'ouvert'); } catch {} return !o; });

  const load = useCallback(() => { chat.list(onglet, term).then(setThreads).catch(() => {}); }, [onglet, term]);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(load, term ? 250 : 0);
    const iv = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 10000);
    window.addEventListener('cc:chat', load);
    return () => { clearTimeout(t); clearInterval(iv); window.removeEventListener('cc:chat', load); };
  }, [open, load, term]);

  const openWin = (id: number | 'new') => setWins(w => {
    const rest = w.filter(x => x.id !== id);
    return [{ id, min: false, t: threads?.find(x => x.id === id) }, ...rest].slice(0, 2);
  });
  const close = (id: number | 'new') => setWins(w => w.filter(x => x.id !== id));
  const minimize = (id: number | 'new') => setWins(w => w.map(x => (x.id === id ? { ...x, min: !x.min } : x)));

  if (path.startsWith('/messagerie')) return null;
  return (
    <div className="dock" aria-label="Messagerie rapide">
      {wins.map(w => (
        <div key={w.id} className={`dock-win${w.min ? ' min' : ''}`}>
          {w.min ? (
            <div className="dock-mini">
              <button className="grow dock-mini-t" onClick={() => minimize(w.id)}>
                {w.t ? <ThreadAvatar t={w.t} meId={me.id} size={24} /> : <Icon name="compose" size={18} />}
                <b>{w.t?.titre ?? 'Nouveau message'}</b>
              </button>
              <button className="tb-btn" title="Fermer" onClick={() => close(w.id)}><Icon name="close" size={16} /></button>
            </div>
          ) : w.id === 'new' ? (
            <NewConversation compact onCreated={id => setWins(ws => ws.map(x => (x.id === 'new' ? { id, min: false } : x)))} onClose={() => close('new')} />
          ) : (
            <ConversationView compact id={w.id} meId={me.id} onClose={() => close(w.id)} onMinimize={() => minimize(w.id)}
              onData={d => setWins(ws => ws.map(x => (x.id === w.id && !x.t ? { ...x, t: d as Thread } : x)))} />
          )}
        </div>
      ))}
      <div className={`dock-panel${open ? ' open' : ''}`}>
        <div className="dock-h">
          <button className="dock-h-main" onClick={toggle} aria-expanded={open}>
            <Avatar kind="user" id={me.id} size={30} />
            <b>Messagerie</b>
            {unread > 0 && <span className="badge-n">{unread}</span>}
          </button>
          <button className="tb-btn" title="Nouveau message" onClick={() => { if (!open) toggle(); openWin('new'); }}><Icon name="compose" size={18} /></button>
          <button className="tb-btn" title={open ? 'Réduire' : 'Ouvrir'} onClick={toggle}><Icon name={open ? 'down' : 'up'} size={18} /></button>
        </div>
        {open && (
          <div className="dock-body">
            <label className="inbox-search"><Icon name="search" size={15} />
              <input placeholder="Rechercher dans les messages" aria-label="Rechercher dans les messages" value={term} onChange={e => setTerm(e.target.value)} />
            </label>
            <div className="dock-tabs" role="tablist">
              <button role="tab" aria-selected={onglet === 'tous'} className={onglet === 'tous' ? 'on' : ''} onClick={() => setOnglet('tous')}>Tous</button>
              <button role="tab" aria-selected={onglet === 'non-lus'} className={onglet === 'non-lus' ? 'on' : ''} onClick={() => setOnglet('non-lus')}>Non lus</button>
            </div>
            <div className="dock-list"><ConversationList compact threads={threads} meId={me.id} onSelect={openWin} /></div>
          </div>
        )}
      </div>
    </div>
  );
}
