'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Fragment, Suspense, useCallback, useEffect, useState } from 'react';
import { GROUP_ICON, NAV, type NavItem } from '@/lib/resources';
import Icon from './Icon';
import NotificationsPopup from './NotificationsPopup';

type Me = { user: { nom: string; email: string; role: string; fonction: string | null }; notifs: number; demandes: number };

function Badge({ badge, demandes }: { badge: NavItem['badge']; demandes: number }) {
  return badge === 'demandes' && demandes ? <span className="badge-n" title={`${demandes} demande(s) d’adhésion à examiner`}>{demandes}</span> : null;
}

// Menu à la GoDaddy : liens directs + rubriques dépliables. path vaut null pendant le pré-rendu.
function NavTree({ path, demandes }: { path: string | null; demandes: number }) {
  const at = (slug: string) => path !== null && (slug ? path === '/' + slug || path.startsWith('/' + slug + '/') : path === '/');
  const hidden = NAV.flatMap(([, items]) => items).filter(i => i.parent !== undefined);
  const isOn = (i: NavItem) => at(i.slug) || hidden.some(h => h.parent === i.slug && at(h.slug));
  const activeGroup = NAV.find(([g, items]) => GROUP_ICON[g] && items.some(i => isOn(i) || at(i.slug)))?.[0];
  const [openG, setOpenG] = useState<Record<string, boolean>>({});
  useEffect(() => { if (activeGroup) setOpenG(o => ({ ...o, [activeGroup]: true })); }, [activeGroup]);

  return NAV.map(([group, items]) => {
    const visible = items.filter(i => i.parent === undefined);
    if (!GROUP_ICON[group]) return (
      <Fragment key={group}>
        {visible.map(i => (
          <Link key={i.slug} href={'/' + i.slug} className={`nav-i${isOn(i) ? ' on' : ''}`} aria-current={isOn(i) ? 'page' : undefined}>
            <span className="nav-ic"><Icon name={i.icon} size={20} /></span><span>{i.label}</span><Badge badge={i.badge} demandes={demandes} />
          </Link>
        ))}
      </Fragment>
    );
    const expanded = !!openG[group];
    const dot = visible.some(i => i.badge === 'demandes') && demandes > 0;
    return (
      <div key={group} className={`nav-grp${expanded ? ' open' : ''}`}>
        <button type="button" className="nav-i nav-parent" aria-expanded={expanded} onClick={() => setOpenG(o => ({ ...o, [group]: !expanded }))}>
          <span className="nav-ic"><Icon name={GROUP_ICON[group]} size={20} />{dot && <i className="nav-dot" />}</span>
          <span>{group}</span>
          <span className="caret"><Icon name="down" size={16} /></span>
        </button>
        {/* Toujours rendu pour pouvoir animer l'ouverture ; inert le rend inaccessible quand il est replié */}
        <div className="nav-sub-wrap" inert={!expanded}>
          <div className="nav-sub">
            {visible.map(i => (
              <Link key={i.slug} href={'/' + i.slug} className={`nav-i${isOn(i) ? ' on' : ''}`} aria-current={isOn(i) ? 'page' : undefined}>
                <span>{i.label}</span><Badge badge={i.badge} demandes={demandes} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  });
}

// Le menu dépend de l'adresse : isolé dans un <Suspense> pour que les pages restent pré-rendues
function NavLinks({ demandes, onNavigate }: { demandes: number; onNavigate: () => void }) {
  const path = usePathname();
  useEffect(onNavigate, [path, onNavigate]);
  return <NavTree path={path} demandes={demandes} />;
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);            // menu ouvert sur mobile
  const [collapsed, setCollapsed] = useState(false);  // menu replié sur ordinateur
  const [pop, setPop] = useState<'notifs' | 'compte' | null>(null);   // fenêtre ouverte depuis la barre du haut
  const [me, setMe] = useState<Me | null>(null);
  const [term, setTerm] = useState('');

  useEffect(() => {
    try { setCollapsed(localStorage.getItem('cc:menu') === 'replie'); } catch {}
  }, []);
  function collapse(v: boolean) {
    setCollapsed(v);
    try { localStorage.setItem('cc:menu', v ? 'replie' : 'ouvert'); } catch {}
  }

  const loadMe = useCallback(() => {
    fetch('/api/auth/me').then(r => {
      if (r.status === 401) window.location.href = '/connexion';
      return r.ok ? r.json() : null;
    }).then(d => d && setMe(d)).catch(() => {});
  }, []);

  // À chaque navigation : on referme tout et on met les compteurs à jour
  const refresh = useCallback(() => {
    setOpen(false);
    setPop(null);
    loadMe();
  }, [loadMe]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setPop(null);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

  useEffect(() => {
    window.addEventListener('cc:refresh', refresh);
    return () => window.removeEventListener('cc:refresh', refresh);
  }, [refresh]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/connexion';
  }

  const demandes = me?.demandes ?? 0;
  return (
    <div className={`shell${collapsed ? ' collapsed' : ''}`}>
      <header className="top">
        <button className="tb-btn" aria-label="Afficher le menu" onClick={() => (window.innerWidth <= 920 ? setOpen(o => !o) : collapse(false))}>
          <Icon name="menu" size={20} />
        </button>
        <form className="search" role="search" onSubmit={e => { e.preventDefault(); if (term.trim()) router.push('/recherche?q=' + encodeURIComponent(term.trim())); }}>
          <Icon name="search" size={16} />
          <input placeholder="Rechercher" aria-label="Recherche" value={term} onChange={e => setTerm(e.target.value)} />
        </form>
        <div className="sp" />
        <button className="tb-btn" aria-label="Notifications" aria-expanded={pop === 'notifs'} onClick={() => setPop(p => (p === 'notifs' ? null : 'notifs'))}>
          <Icon name="bell" size={20} />
          {!!me?.notifs && <span className="bell-dot">{me.notifs}</span>}
        </button>
        <button className="me" style={{ cursor: 'pointer' }} aria-expanded={pop === 'compte'} onClick={() => setPop(p => (p === 'compte' ? null : 'compte'))} title={me?.user.nom} aria-label="Mon compte">
          {(me?.user.nom ?? '?').slice(0, 1).toUpperCase()}
        </button>
      </header>
      {pop && <div className="pop-bg" onClick={() => setPop(null)} />}
      {pop === 'notifs' && <NotificationsPopup onChange={loadMe} />}
      {pop === 'compte' && me && (
        <div className="npanel pop" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div><b>{me.user.nom}</b><div className="small muted">{me.user.email}</div><div className="small muted">{me.user.role}{me.user.fonction ? ' · ' + me.user.fonction : ''}</div></div>
          <button className="btn" onClick={logout}>Se déconnecter</button>
        </div>
      )}
      <div className="app">
        <aside className={`side${open ? ' open' : ''}`} id="side" aria-label="Menu du back-office">
          <div className="side-h">
            <button type="button" className="tb-btn side-toggle" aria-label="Replier le menu" title="Replier le menu" onClick={() => collapse(true)}>
              <Icon name="sidebar" size={20} />
            </button>
            <div className="brand"><img className="logo" src="/logo-app.png" alt="" width={30} height={30} /><b>L’Alliée Virtuelle</b></div>
          </div>
          <nav className="nav">
            <Suspense fallback={<NavTree path={null} demandes={demandes} />}><NavLinks demandes={demandes} onNavigate={refresh} /></Suspense>
          </nav>
        </aside>
        <main className="main"><div className="content">{children}</div></main>
      </div>
    </div>
  );
}
