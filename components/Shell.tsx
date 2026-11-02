'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { NAV, type NavItem } from '@/lib/resources';
import Icon from './Icon';

type Me = { user: { nom: string; email: string; role: string; fonction: string | null }; notifs: number; demandes: number };

function Badge({ badge, demandes }: { badge: NavItem['badge']; demandes: number }) {
  if (badge === 'demandes') return demandes ? <span className="badge-n" title="Demandes à examiner">{demandes}</span> : null;
  if (badge === 'new') return <span className="badge-new">Nouveau</span>;
  if (badge === 'up') return <span className="badge-up">Amélioré</span>;
  return null;
}

// Le menu dépend de l'adresse : isolé dans un <Suspense> pour que les pages restent pré-rendues
function NavLinks({ demandes, onNavigate }: { demandes: number; onNavigate: () => void }) {
  const path = usePathname();
  useEffect(onNavigate, [path, onNavigate]);
  const at = (slug: string) => slug ? path === '/' + slug || path.startsWith('/' + slug + '/') : path === '/';
  const hidden = NAV.flatMap(([, items]) => items).filter(i => i.parent !== undefined);
  return NAV.map(([group, items]) => (
    <div className="nav-g" key={group}>
      <div className="eyebrow">{group}</div>
      {items.filter(i => i.parent === undefined).map(i => {
        const on = at(i.slug) || hidden.some(h => h.parent === i.slug && at(h.slug));
        return (
          <Link key={i.slug} href={'/' + i.slug} className={on ? 'on' : ''}>
            <Icon name={i.icon} /><span>{i.label}</span><Badge badge={i.badge} demandes={demandes} />
          </Link>
        );
      })}
    </div>
  ));
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [term, setTerm] = useState('');

  const refresh = useCallback(() => {
    setOpen(false);
    setPanel(false);
    fetch('/api/auth/me').then(r => {
      if (r.status === 401) window.location.href = '/connexion';
      return r.ok ? r.json() : null;
    }).then(d => d && setMe(d)).catch(() => {});
  }, []);

  useEffect(() => {
    window.addEventListener('cc:refresh', refresh);
    return () => window.removeEventListener('cc:refresh', refresh);
  }, [refresh]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/connexion';
  }

  const nav = NAV.map(([g, items]) => <div className="nav-g" key={g}><div className="eyebrow">{g}</div>{items.filter(i => i.parent === undefined).map(i => <Link key={i.slug} href={'/' + i.slug}><Icon name={i.icon} /><span>{i.label}</span></Link>)}</div>);
  return (
    <>
      <header className="top">
        <button className="tb-btn" aria-label="Ouvrir le menu" onClick={() => setOpen(o => !o)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
        <form className="search" role="search" onSubmit={e => { e.preventDefault(); if (term.trim()) router.push('/recherche?q=' + encodeURIComponent(term.trim())); }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
          <input placeholder="Rechercher un membre, un événement, une facture…" aria-label="Recherche" value={term} onChange={e => setTerm(e.target.value)} />
        </form>
        <div className="sp" />
        <Link className="tb-btn" href="/notifications" aria-label="Notifications">
          <Icon name="bell" size={19} />
          {!!me?.notifs && <span className="bell-dot">{me.notifs}</span>}
        </Link>
        <button className="me" style={{ cursor: 'pointer' }} onClick={() => setPanel(p => !p)} title={me?.user.nom} aria-label="Mon compte">
          {(me?.user.nom ?? '?').slice(0, 1).toUpperCase()}
        </button>
      </header>
      {panel && me && (
        <div className="npanel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div><b>{me.user.nom}</b><div className="small muted">{me.user.email}</div><div className="small muted">{me.user.role}{me.user.fonction ? ' · ' + me.user.fonction : ''}</div></div>
          <button className="btn" onClick={logout}>Se déconnecter</button>
        </div>
      )}
      <div className="app">
        <aside className={`side${open ? ' open' : ''}`} id="side" aria-label="Menu du back-office">
          <div className="brand"><div className="brand-mark">CC</div><div><b>CanCham Connect</b><span>Back-office · version 2</span></div></div>
          <nav>
            <Suspense fallback={nav}><NavLinks demandes={me?.demandes ?? 0} onNavigate={refresh} /></Suspense>
          </nav>
          <div className="legend">
            <span><span className="badge-new">Nouveau</span> module ajouté</span>
            <span><span className="badge-up">Amélioré</span> module existant enrichi</span>
          </div>
        </aside>
        <main className="main"><div className="content">{children}</div></main>
      </div>
    </>
  );
}
