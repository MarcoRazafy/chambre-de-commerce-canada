'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { NAV, PIED, type NavItem } from '@/lib/resources';
import Icon from './Icon';
import NotificationsPopup from './NotificationsPopup';
import Toaster from './Toaster';
import Avatar from './Avatar';
import Breadcrumb from './Breadcrumb';
import Palette from './Palette';
import { CREER } from '@/lib/creer';

type Me = { user: { id: number; nom: string; email: string; role: string; fonction: string | null }; notifs: number; messages: number; demandes: number; reglements: number; org: string | null };

// Page active : l'adresse elle-même ou une page rattachée (ex. /contacts → Membres). path vaut null pendant le pré-rendu.
const HIDDEN = NAV.flatMap(([, items]) => items).filter(i => i.parent !== undefined);
function matcher(path: string | null) {
  const at = (slug: string) => path !== null && (slug ? path === '/' + slug || path.startsWith('/' + slug + '/') : path === '/');
  return (i: NavItem) => at(i.slug) || HIDDEN.some(h => h.parent === i.slug && at(h.slug));
}

function Lien({ i, on, n }: { i: NavItem; on: boolean; n: number }) {
  return (
    <Link href={'/' + i.slug} className={`nav-i${on ? ' on' : ''}${n ? ' has-cnt' : ''}`} aria-current={on ? 'page' : undefined} title={i.label}>
      <span className="nav-ic"><Icon name={i.icon} size={18} /></span><span className="lbl">{i.label}</span>
      {n > 0 && <span className="cnt" aria-label={`${n} à traiter`}>{n}</span>}
    </Link>
  );
}

// Menu en sections titrées (Membres, Activités…), la section « Plateforme » en bas
function Menu({ path, me, pied }: { path: string | null; me: Me | null; pied?: boolean }) {
  const isOn = matcher(path);
  const compte = (i: NavItem) => (i.badge === 'demandes' ? me?.demandes ?? 0 : i.badge === 'reglements' ? me?.reglements ?? 0 : i.badge === 'messages' ? me?.messages ?? 0 : 0);
  return NAV.filter(([g]) => (g === PIED) === !!pied).map(([group, items]) => (
    <div key={group || 'accueil'} className="nav-sec">
      {group && !pied && <div className="nav-eyebrow">{group}</div>}
      {items.filter(i => i.parent === undefined && (!i.admin || me?.user.role === 'Administrateur')).map(i => <Lien key={i.slug} i={i} on={isOn(i)} n={compte(i)} />)}
    </div>
  ));
}

// L'adresse est lue sous <Suspense> pour que les pages restent pré-rendues
function MenuAdresse({ me, pied, onNavigate }: { me: Me | null; pied?: boolean; onNavigate?: () => void }) {
  const path = usePathname();
  useEffect(() => { onNavigate?.(); }, [path, onNavigate]);
  return <Menu path={path} me={me} pied={pied} />;
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);            // menu ouvert sur mobile
  const [collapsed, setCollapsed] = useState(false);  // menu replié en colonne d'icônes (ordinateur)
  const [pop, setPop] = useState<'notifs' | 'compte' | 'creer' | null>(null);
  const [palette, setPalette] = useState(false);
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => { try { setCollapsed(localStorage.getItem('cc:menu') === 'replie'); } catch {} }, []);
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
  const refresh = useCallback(() => { setOpen(false); setPop(null); setPalette(false); loadMe(); }, [loadMe]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPop(null);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(true); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
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

  const org = me?.org ?? 'CanCham Madagascar';
  return (
    <div className={`shell${collapsed ? ' collapsed' : ''}`}>
      <div className="app">
        <aside className={`side${open ? ' open' : ''}`} id="side" aria-label="Menu principal">
          <div className="org" title={org}>
            <img className="org-mark" src="/logo-mark.png" alt="L’Alliée Virtuelle" width={34} height={24} />
            <div className="lbl"><b>{org}</b><span>propulsé par L’Alliée Virtuelle</span></div>
          </div>
          <nav className="nav" aria-label="Pages">
            <Suspense fallback={<Menu path={null} me={me} />}><MenuAdresse me={me} onNavigate={refresh} /></Suspense>
          </nav>
          <div className="side-foot">
            <nav className="nav" aria-label="Plateforme">
              <Suspense fallback={<Menu path={null} me={me} pied />}><MenuAdresse me={me} pied /></Suspense>
            </nav>
            <button type="button" className="nav-i collapse-btn" onClick={() => collapse(!collapsed)} title={collapsed ? 'Déplier le menu' : 'Replier le menu'}>
              <span className="nav-ic"><Icon name={collapsed ? 'expand' : 'collapse'} size={18} /></span><span className="lbl">Replier le menu</span>
            </button>
          </div>
        </aside>
        <div className="main-col">
          <header className="top">
            <button type="button" className="tb-btn menu-btn" aria-label="Ouvrir le menu" onClick={() => setOpen(o => !o)}><Icon name="menu" size={20} /></button>
            <button type="button" className="search" onClick={() => setPalette(true)} aria-label="Rechercher ou aller à une page">
              <Icon name="search" size={16} /><span>Rechercher un membre, une facture, une page…</span><kbd>Ctrl K</kbd>
            </button>
            <div className="sp" />
            <div className="creer">
              <button type="button" className="btn cta" aria-haspopup="menu" aria-expanded={pop === 'creer'} onClick={() => setPop(p => (p === 'creer' ? null : 'creer'))}>
                <Icon name="plus" size={16} /><span className="lbl2">Créer</span></button>
              {pop === 'creer' && (
                <div className="creer-pop pop" role="menu">
                  {CREER.map(([ic, l, href]) => (
                    <button key={l} type="button" role="menuitem" onClick={() => {
                      setPop(null);
                      // Déjà sur la page : le formulaire s'ouvre sans recharger ; sinon on y va avec ?nouveau=1
                      const [chemin] = href.split('?');
                      if (window.location.pathname === chemin && href.includes('nouveau')) window.dispatchEvent(new CustomEvent('cc:nouveau', { detail: chemin }));
                      else router.push(href);
                    }}><Icon name={ic} size={16} /> {l}</button>
                  ))}
                </div>
              )}
            </div>
            <Link className="tb-btn ring" href="/messagerie" title="Messagerie" aria-label={me?.messages ? `Messagerie, ${me.messages} conversation(s) non lue(s)` : 'Messagerie'}>
              <Icon name="chat" size={18} />{!!me?.messages && <span className="bell-dot">{me.messages}</span>}
            </Link>
            <button type="button" className="tb-btn ring" title="Notifications" aria-label="Notifications" aria-expanded={pop === 'notifs'} onClick={() => setPop(p => (p === 'notifs' ? null : 'notifs'))}>
              <Icon name="bell" size={18} />{!!me?.notifs && <span className="bell-dot">{me.notifs}</span>}
            </button>
            <button type="button" className="me" aria-expanded={pop === 'compte'} onClick={() => setPop(p => (p === 'compte' ? null : 'compte'))} title={me?.user.nom} aria-label="Mon compte">
              {me ? <Avatar kind="user" id={me.user.id} size={38} /> : '?'}
            </button>
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
          <Link className="btn" href="/parametres"><Icon name="gear" size={16} /> Paramètres</Link>
          <button className="btn" onClick={logout}><Icon name="logout" size={16} /> Se déconnecter</button>
        </div>
      )}
      {palette && <Palette onClose={() => setPalette(false)} />}
      <Toaster />
    </div>
  );
}
