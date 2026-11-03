'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import type { Row } from '@/lib/format';
import { FILTRES, chat, type Person, type Thread } from '@/lib/chat';
import Icon from './Icon';
import ConversationList from './chat/ConversationList';
import ConversationView from './chat/ConversationView';
import InfoPanel from './chat/InfoPanel';
import NewConversation from './chat/NewConversation';

type Me = { id: number; role: string };

// Page Messagerie façon LinkedIn : liste filtrable à gauche, conversation au centre, informations à droite
function Inbox() {
  const router = useRouter();
  const sp = useSearchParams();
  const [me, setMe] = useState<Me | null>(null);
  const [filtre, setFiltre] = useState('tous');
  const [term, setTerm] = useState('');
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [cur, setCur] = useState<number | null>(Number(sp.get('c')) || null);
  const [nouveau, setNouveau] = useState<Person[] | null>(null);
  const [info, setInfo] = useState(false);
  const [data, setData] = useState<Row | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { fetch('/api/auth/me').then(r => r.json()).then(d => d.user && setMe(d.user)); }, []);
  // La page reste en mémoire (cachée) après navigation : une classe posée/retirée ici, plutôt qu'un :has(.inbox) en CSS,
  // rend la barre de défilement aux autres pages dès qu'on quitte la messagerie
  useEffect(() => {
    document.body.classList.add('inbox-page');
    return () => document.body.classList.remove('inbox-page');
  }, []);
  // Liens « écrire à » : /messagerie?a=member:12 ou ?a=user:3, et ?c=<conversation>
  useEffect(() => {
    const c = Number(sp.get('c'));
    if (c) { setCur(c); setNouveau(null); }
    const a = sp.get('a');
    if (a) {
      const [kind, id] = a.split(':');
      setNouveau([{ kind: kind as Person['kind'], id: Number(id), nom: sp.get('nom') ?? '' }]);
    }
  }, [sp]);

  const load = useCallback(() => {
    chat.list(filtre, term).then(l => { setThreads(l); setError(''); }).catch(e => setError(e.message));
  }, [filtre, term]);
  useEffect(() => {
    const t = setTimeout(load, term ? 250 : 0);
    const iv = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 6000);
    window.addEventListener('cc:chat', load);
    return () => { clearTimeout(t); clearInterval(iv); window.removeEventListener('cc:chat', load); };
  }, [load, term]);

  const select = (id: number | null) => {
    setCur(id);
    setNouveau(null);
    setData(null);
    router.replace(id ? `/messagerie?c=${id}` : '/messagerie', { scroll: false });
  };

  if (!me) return <div className="empty">Chargement…</div>;
  const open = cur !== null || nouveau !== null;
  return (
    <div className={`inbox${open ? ' has-open' : ''}`}>
      <div className="inbox-top">
        <h1>Messagerie</h1>
        <label className="inbox-search"><Icon name="search" size={16} />
          <input placeholder="Rechercher dans les messages" aria-label="Rechercher dans les messages" value={term} onChange={e => setTerm(e.target.value)} />
        </label>
        <button className="tb-btn" title="Nouveau message" aria-label="Nouveau message" onClick={() => { setCur(null); setNouveau([]); }}><Icon name="compose" size={22} /></button>
      </div>
      <div className="inbox-filters" role="tablist" aria-label="Filtrer les conversations">
        {FILTRES.map(([k, l]) => <button key={k} role="tab" aria-selected={filtre === k} className={`fchip${filtre === k ? ' on' : ''}`} onClick={() => setFiltre(k)}>{l}</button>)}
      </div>
      {error && <div className="err">{error}</div>}
      <div className={`inbox-body${info && data ? ' with-info' : ''}${open ? ' has-open' : ''}`}>
        <aside className="inbox-list" aria-label="Conversations">
          <ConversationList threads={threads} active={cur} meId={me.id} onSelect={select} />
        </aside>
        <section className="inbox-main">
          {nouveau !== null ? <NewConversation key={nouveau.map(p => p.kind + p.id).join()} initial={nouveau} onCreated={id => select(id)} onClose={() => setNouveau(null)} onBack={() => select(null)} />
            : cur !== null ? <ConversationView key={cur} id={cur} meId={me.id} infoOpen={info} onToggleInfo={() => setInfo(v => !v)} onData={setData} onBack={() => select(null)} />
            : (
              <div className="inbox-empty">
                <Icon name="chat" size={40} />
                <b>Choisissez une conversation</b>
                <p className="small muted">ou écrivez à un collègue, à un membre ou à plusieurs personnes à la fois.</p>
                <button className="btn cta" onClick={() => setNouveau([])}><Icon name="compose" size={16} /> Nouveau message</button>
              </div>
            )}
        </section>
        {info && data && cur !== null && <aside className="inbox-info"><InfoPanel d={data} me={me} onSwitch={select} onClose={() => setInfo(false)} /></aside>}
      </div>
    </div>
  );
}

export default function Messagerie() {
  return <Suspense fallback={<div className="empty">Chargement…</div>}><Inbox /></Suspense>;
}
