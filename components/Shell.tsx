'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Fragment, Suspense, useCallback, useEffect, useState } from 'react';
import { GROUP_ICON, NAV, type NavItem } from '@/lib/resources';
import Icon from './Icon';
import NotificationsPopup from './NotificationsPopup';
import Toaster from './Toaster';
import Avatar from './Avatar';
import Breadcrumb from './Breadcrumb';
import MessagingDock from './chat/MessagingDock';

type Me = { user: { id: number; nom: string; email: string; role: string; fonction: string | null }; notifs: number; messages: number; demandes: number };

function Badge({ badge, demandes }: { badge: NavItem['badge']; demandes: number }) {
  return badge === 'demandes' && demandes ? <span className="badge-n" title={`${demandes} demande(s) d’adhésion à examiner`}>{demandes}</span> : null;
}

// Page active : l'adresse elle-même ou une page rattachée (ex. /contacts → Membres). path vaut null pendant le pré-rendu.
const HIDDEN = NAV.flatMap(([, items]) => items).filter(i => i.parent !== undefined);
function matcher(path: string | null) {
  const at = (slug: string) => path !== null && (slug ? path === '/' + slug || path.startsWith('/' + slug + '/') : path === '/');
  return { at, isOn: (i: NavItem) => at(i.slug) || HIDDEN.some(h => h.parent === i.slug && at(h.slug)) };
}

// Menu déplié, à la GoDaddy : liens directs + rubriques dépliables
function NavTree({ path, demandes }: { path: string | null; demandes: number }) {
  const { at, isOn } = matcher(path);
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

// Menu replié : une colonne d'icônes ; une rubrique ouvre ses pages dans un petit panneau à côté
function RailNav({ path, demandes }: { path: string | null; demandes: number }) {
  const { isOn } = matcher(path);
  const [fly, setFly] = useState<{ group: string; top: number } | null>(null);
  useEffect(() => setFly(null), [path]);
  useEffect(() => {
    if (!fly) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !(e.target as Element).closest('.rail-fly, .rail-i[aria-expanded="true"]')) setFly(null);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [fly]);

  const flyItems = fly ? NAV.find(([g]) => g === fly.group)![1].filter(i => i.parent === undefined) : [];
  return (
    <>
      {NAV.map(([group, items]) => {
        const visible = items.filter(i => i.parent === undefined);
        if (!GROUP_ICON[group]) return (
          <Fragment key={group}>
            {visible.map(i => (
              <Link key={i.slug} href={'/' + i.slug} className={`rail-i${isOn(i) ? ' on' : ''}`} aria-label={i.label} title={i.label} aria-current={isOn(i) ? 'page' : undefined}>
                <Icon name={i.icon} size={20} />
              </Link>
            ))}
          </Fragment>
        );
        const open = fly?.group === group;
        const dot = visible.some(i => i.badge === 'demandes') && demandes > 0;
        return (
          <button key={group} type="button" className={`rail-i${visible.some(isOn) ? ' on' : ''}${open ? ' open' : ''}`} aria-label={group} title={group} aria-expanded={open}
            onClick={e => { const top = e.currentTarget.getBoundingClientRect().top; setFly(f => (f?.group === group ? null : { group, top })); }}>
            <Icon name={GROUP_ICON[group]} size={20} />{dot && <i className="nav-dot" />}
          </button>
        );
      })}
      {fly && (
        <div className="rail-fly pop" style={{ top: fly.top }}>
          <div className="rail-fly-h">{fly.group}</div>
          {flyItems.map(i => (
            <Link key={i.slug} href={'/' + i.slug} className={`nav-i${isOn(i) ? ' on' : ''}`} aria-current={isOn(i) ? 'page' : undefined}>
              <span>{i.label}</span><Badge badge={i.badge} demandes={demandes} />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

// Mode sombre : retenu dans ce navigateur (lu par le script de app/layout.tsx au chargement)
// Le menu dépend de l'adresse : isolé dans un <Suspense> pour que les pages restent pré-rendues
function NavLinks({ demandes, rail, onNavigate }: { demandes: number; rail: boolean; onNavigate: () => void }) {
  const path = usePathname();
  useEffect(onNavigate, [path, onNavigate]);
  return rail ? <RailNav path={path} demandes={demandes} /> : <NavTree path={path} demandes={demandes} />;
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);            // menu ouvert sur mobile
  const [collapsed, setCollapsed] = useState(false);  // menu replié en colonne d'icônes (ordinateur)
  const [mobile, setMobile] = useState(false);        // sur mobile, le menu reste un tiroir
  const [pop, setPop] = useState<'notifs' | 'compte' | null>(null);   // fenêtre ouverte depuis la barre du haut
  const [me, setMe] = useState<Me | null>(null);
  const [term, setTerm] = useState('');

  useEffect(() => {
    try { setCollapsed(localStorage.getItem('cc:menu') === 'replie'); } catch {}
    const mq = window.matchMedia('(max-width: 920px)');
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
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
    window.addEventListener('cc:chat', loadMe);   // une conversation a changé : compteurs à jour
    const t = setInterval(() => { if (document.visibilityState === 'visible') loadMe(); }, 20000);
    return () => { window.removeEventListener('cc:refresh', refresh); window.removeEventListener('cc:chat', loadMe); clearInterval(t); };
  }, [refresh, loadMe]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/connexion';
  }

  const demandes = me?.demandes ?? 0;
  const rail = collapsed && !mobile;
  return (
    <div className={`shell${rail ? ' collapsed' : ''}`}>
      <div className="app">
        <aside className={`side${open ? ' open' : ''}`} id="side" aria-label="Menu du back-office">
          {rail ? (
            <>
              <div className="rail-h"><img className="logo-mark" src="/logo-mark.png" alt="L’Alliée Virtuelle" width={34} height={24} /></div>
              <button type="button" className="rail-i rail-toggle" aria-label="Déplier le menu" title="Déplier le menu" onClick={() => collapse(false)}>
                <Icon name="expand" size={20} />
              </button>
              <nav className="rail">
                <Suspense fallback={<RailNav path={null} demandes={demandes} />}><NavLinks rail demandes={demandes} onNavigate={refresh} /></Suspense>
              </nav>
            </>
          ) : (
            <>
              <div className="side-h">
                <button type="button" className="tb-btn side-toggle" aria-label="Replier le menu" title="Replier le menu" onClick={() => collapse(true)}>
                  <Icon name="collapse" size={20} />
                </button>
                <div className="brand"><img className="logo-mark" src="/logo-mark.png" alt="" width={34} height={24} /><b>L’Alliée Virtuelle</b></div>
              </div>
              <nav className="nav">
                <Suspense fallback={<NavTree path={null} demandes={demandes} />}><NavLinks rail={false} demandes={demandes} onNavigate={refresh} /></Suspense>
              </nav>
            </>
          )}
        </aside>
        <div className="main-col">
          {/* Barre du haut sans couleur propre : même fond que la page, recherche au centre */}
          <header className="top">
            <div className="top-l">
              <button className="tb-btn" aria-label="Afficher le menu" onClick={() => setOpen(o => !o)}>
                <Icon name="menu" size={20} />
              </button>
            </div>
            <form className="search" role="search" onSubmit={e => { e.preventDefault(); if (term.trim()) router.push('/recherche?q=' + encodeURIComponent(term.trim())); }}>
              <Icon name="search" size={16} />
              <input placeholder="Rechercher un membre, une facture, un événement…" aria-label="Recherche" value={term} onChange={e => setTerm(e.target.value)} />
            </form>
            <div className="top-r">
              <Link className="tb-btn" href="/messagerie" title="Messagerie"
                aria-label={me?.messages ? `Messagerie, ${me.messages} conversation(s) non lue(s)` : 'Messagerie'}>
                <Icon name="chat" size={20} />
                {!!me?.messages && <span className="bell-dot">{me.messages}</span>}
              </Link>
              <button className="tb-btn" title="Notifications" aria-label="Notifications" aria-expanded={pop === 'notifs'} onClick={() => setPop(p => (p === 'notifs' ? null : 'notifs'))}>
                <Icon name="bell" size={20} />
                {!!me?.notifs && <span className="bell-dot">{me.notifs}</span>}
              </button>
              <button className="me" style={{ cursor: 'pointer' }} aria-expanded={pop === 'compte'} onClick={() => setPop(p => (p === 'compte' ? null : 'compte'))} title={me?.user.nom} aria-label="Mon compte">
                {me ? <Avatar kind="user" id={me.user.id} size={34} /> : '?'}
              </button>
            </div>
          </header>
          <main className="main"><div className="content"><Suspense fallback={null}><Breadcrumb /></Suspense>{children}</div></main>
        </div>
      </div>
      {open && <div className="pop-bg" onClick={() => setOpen(false)} />}   {/* mobile : un toucher à côté referme le menu */}
      {pop && <div className="pop-bg" onClick={() => setPop(null)} />}
      {pop === 'notifs' && <NotificationsPopup onChange={loadMe} onClose={() => setPop(null)} />}
      {pop === 'compte' && me && (
        <div className="npanel pop" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="row" style={{ flexWrap: 'nowrap' }}><Avatar kind="user" id={me.user.id} size={44} />
            <div><b>{me.user.nom}</b><div className="small muted">{me.user.email}</div><div className="small muted">{me.user.role}{me.user.fonction ? ' · ' + me.user.fonction : ''}</div></div></div>
          <Link className="btn" href="/profil">Mon profil</Link>
          <button className="btn" onClick={logout}><Icon name="logout" size={16} /> Se déconnecter</button>
        </div>
      )}
      {me && !mobile && <Suspense fallback={null}><MessagingDock me={me.user} unread={me.messages} /></Suspense>}
      <Toaster />
    </div>
  );
}
