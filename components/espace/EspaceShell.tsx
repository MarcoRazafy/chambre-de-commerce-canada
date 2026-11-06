'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, Suspense, useCallback, useContext, useEffect, useState } from 'react';
import Avatar from '../Avatar';
import Icon from '../Icon';
import Toaster from '../Toaster';

export type Moi = { contact_id: number; nom: string; email: string; fonction: string | null; member_id: number; entreprise: string; statut: string;
  maillage: { faites: number; total: number; pct: number }; messages: number; factures: number };
const Ctx = createContext<{ moi: Moi | null; recharger: () => void }>({ moi: null, recharger: () => {} });
export const useMoi = () => useContext(Ctx);

type Lien = { href: string; label: string; icon: string; badge?: 'messages' | 'factures' | 'maillage' };
// Menu de l'espace membre, en sections comme celui de l'équipe
const MENU: [string, Lien[]][] = [
  ['', [{ href: '/espace', label: 'Accueil', icon: 'home' }]],
  ['Mon entreprise', [
    { href: '/espace/profil', label: 'Mon entreprise', icon: 'store' },
    { href: '/espace/maillage', label: 'Questionnaire de maillage', icon: 'list', badge: 'maillage' },
    { href: '/espace/factures', label: 'Mes factures', icon: 'file', badge: 'factures' },
  ]],
  ['Réseau', [
    { href: '/espace/annuaire', label: 'Annuaire des membres', icon: 'book' },
    { href: '/espace/relations', label: 'Mises en relation', icon: 'spark' },
  ]],
  ['Activités', [
    { href: '/espace/evenements', label: 'Événements', icon: 'cal' },
    { href: '/espace/actualites', label: 'Actualités', icon: 'news' },
    { href: '/espace/ressources', label: 'Ressources', icon: 'folder' },
  ]],
  ['Communication', [{ href: '/espace/messagerie', label: 'Messagerie', icon: 'chat', badge: 'messages' }]],
];

function Menu({ moi, onNavigate }: { moi: Moi | null; onNavigate: () => void }) {
  const path = usePathname();
  useEffect(() => { onNavigate(); }, [path, onNavigate]);
  const actif = (h: string) => (h === '/espace' ? path === h : path === h || path.startsWith(h + '/'));
  const n = (b?: Lien['badge']) => (!moi || !b ? 0 : b === 'messages' ? moi.messages : b === 'factures' ? moi.factures : moi.maillage.pct < 100 ? 1 : 0);
  return MENU.map(([g, liens]) => (
    <div key={g || 'accueil'} className="nav-sec">
      {g && <div className="nav-eyebrow">{g}</div>}
      {liens.map(l => {
        const on = actif(l.href), c = n(l.badge);
        return (
          <Link key={l.href} href={l.href} className={`nav-i${on ? ' on' : ''}${c ? ' has-cnt' : ''}`} aria-current={on ? 'page' : undefined} title={l.label}>
            <span className="nav-ic"><Icon name={l.icon} size={18} /></span><span className="lbl">{l.label}</span>
            {c > 0 && (l.badge === 'maillage' ? <span className="cnt es-cnt-doux" aria-label="À compléter">!</span> : <span className="cnt" aria-label={`${c} à voir`}>{c}</span>)}
          </Link>
        );
      })}
    </div>
  ));
}

// Enveloppe de l'espace membre : même charpente que le back-office (menu à gauche, barre du haut)
export default function EspaceShell({ children }: { children: React.ReactNode }) {
  const [moi, setMoi] = useState<Moi | null>(null);
  const [open, setOpen] = useState(false);
  const [compte, setCompte] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const recharger = useCallback(() => {
    fetch('/api/espace/moi').then(r => { if (r.status === 401) { window.location.href = '/connexion'; return null; } return r.json(); }).then(m => m && setMoi(m)).catch(() => {});
  }, []);
  useEffect(() => { try { setCollapsed(localStorage.getItem('cc:menu-membre') === '1'); } catch { /* navigation privée */ } }, []);
  const naviguer = useCallback(() => { setOpen(false); setCompte(false); recharger(); }, [recharger]);
  const replier = (v: boolean) => { setCollapsed(v); try { localStorage.setItem('cc:menu-membre', v ? '1' : '0'); } catch { /* */ } };
  async function sortir() {
    await fetch('/api/espace/deconnexion', { method: 'POST' });
    window.location.href = '/connexion';
  }

  return (
    <Ctx.Provider value={{ moi, recharger }}>
      <div className={`shell es-shell${collapsed ? ' collapsed' : ''}`}>
        <div className="app">
          <aside className={`side${open ? ' open' : ''}`} aria-label="Menu de l’espace membre">
            <div className="org" title="CanCham Madagascar">
              <img className="org-mark" src="/logo-mark.png" alt="L’Alliée Virtuelle" width={34} height={24} />
              <div className="lbl"><b>CanCham Madagascar</b><span>Espace membre</span></div>
            </div>
            <nav className="nav" aria-label="Pages">
              <Suspense fallback={null}><Menu moi={moi} onNavigate={naviguer} /></Suspense>
            </nav>
            <div className="side-foot">
              <nav className="nav" aria-label="Compte">
                <button type="button" className="nav-i" onClick={sortir} title="Se déconnecter"><span className="nav-ic"><Icon name="logout" size={18} /></span><span className="lbl">Se déconnecter</span></button>
              </nav>
              <button type="button" className="nav-i collapse-btn" onClick={() => replier(!collapsed)} title={collapsed ? 'Déplier le menu' : 'Replier le menu'}>
                <span className="nav-ic"><Icon name={collapsed ? 'expand' : 'collapse'} size={18} /></span><span className="lbl">Replier le menu</span>
              </button>
            </div>
          </aside>
          <div className="main-col">
            <header className="top">
              <button type="button" className="tb-btn menu-btn" aria-label="Ouvrir le menu" onClick={() => setOpen(o => !o)}><Icon name="menu" size={20} /></button>
              <div className="es-top-titre">{moi && <><b>{moi.entreprise}</b><span>{moi.nom}{moi.fonction ? ` · ${moi.fonction}` : ''}</span></>}</div>
              <div className="sp" />
              <Link className="btn cta es-ecrire" href="/espace/messagerie?ecrire=1"><Icon name="compose" size={16} /><span className="lbl2">Écrire à la Chambre</span></Link>
              <Link className="tb-btn ring" href="/espace/messagerie" title="Messagerie" aria-label={moi?.messages ? `Messagerie, ${moi.messages} non lu(s)` : 'Messagerie'}>
                <Icon name="chat" size={18} />{!!moi?.messages && <span className="bell-dot">{moi.messages}</span>}
              </Link>
              <button type="button" className="me" aria-expanded={compte} onClick={() => setCompte(c => !c)} title={moi?.entreprise} aria-label="Mon compte">
                {moi ? <Avatar kind="member" id={moi.member_id} size={38} nom={moi.entreprise} /> : '?'}
              </button>
            </header>
            <main className="main"><div className="content">{children}</div></main>
          </div>
        </div>
        {open && <div className="pop-bg" onClick={() => setOpen(false)} />}
        {compte && moi && <>
          <div className="pop-bg" onClick={() => setCompte(false)} />
          <div className="npanel pop" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="row" style={{ flexWrap: 'nowrap' }}><Avatar kind="member" id={moi.member_id} size={44} nom={moi.entreprise} />
              <div><b>{moi.nom}</b><div className="small muted">{moi.email}</div><div className="small muted">{moi.entreprise}</div></div></div>
            <Link className="btn" href="/espace/profil" onClick={() => setCompte(false)}><Icon name="store" size={16} /> Mon entreprise</Link>
            <button className="btn" onClick={sortir}><Icon name="logout" size={16} /> Se déconnecter</button>
          </div>
        </>}
        <Toaster />
      </div>
    </Ctx.Provider>
  );
}
