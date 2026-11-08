'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, Suspense, useCallback, useContext, useEffect, useState } from 'react';
import Avatar from '../Avatar';
import Icon from '../Icon';
import Palette, { type Opt } from '../Palette';
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

// Recherche (Ctrl K) : les pages du menu, les actions courantes, puis l'annuaire, les événements, les actualités, les ressources
const PAGES: Opt[] = MENU.flatMap(([, l]) => l).map(l => ({ groupe: 'Pages', label: l.label, href: l.href, icon: l.icon }));
const ACTIONS: Opt[] = [
  { groupe: 'Actions', label: 'Écrire à la Chambre', href: '/espace/messagerie?ecrire=1', icon: 'compose' },
  { groupe: 'Actions', label: 'Ajouter un produit ou un service', href: '/espace/profil#ajouter-service', icon: 'plus' },
  { groupe: 'Actions', label: 'Compléter mon questionnaire de maillage', href: '/espace/maillage', icon: 'list' },
];

type Notif = { cle: string; icone: string; texte: string; quand: string | null; lien: string; afaire?: boolean };
const VUES = 'cc:notifs-vues';
const vues = (): string[] => { try { return JSON.parse(localStorage.getItem(VUES) ?? '[]'); } catch { return []; } };
const quand = (d: string) => { const x = new Date(d); return x.toLocaleString('fr-FR', { day: 'numeric', month: 'short', ...(x.getHours() || x.getMinutes() ? { hour: '2-digit', minute: '2-digit' } : {}) }); };

// Cloche : ce qui attend le membre et les nouveautés de la Chambre. Ce qui est vu est retenu par le navigateur.
function Notifications({ liste, onVu, onClose }: { liste: Notif[] | null; onVu: (cles: string[]) => void; onClose: () => void }) {
  const router = useRouter();
  const deja = vues();
  const nonVues = (liste ?? []).filter(n => !deja.includes(n.cle));
  return (
    <div className="npanel pop notif-pop" role="dialog" aria-label="Notifications">
      <div className="notif-h"><b>Notifications</b>
        {nonVues.length > 0 && <button className="btn ghost sm" onClick={() => onVu(nonVues.map(n => n.cle))}>Tout marquer comme lu</button>}</div>
      {liste === null ? <div className="empty">Chargement…</div> : liste.length === 0 ? <div className="empty">Rien de nouveau pour le moment.</div> : (
        <ul className="notif-list">
          {liste.map(n => {
            const lu = deja.includes(n.cle);
            return (
              <li key={n.cle}>
                <button className={`notif-i has-link${lu ? '' : ' unread'}`} onClick={() => { onVu([n.cle]); onClose(); router.push(n.lien); }}>
                  <span className="notif-dot" aria-hidden="true" />
                  <span className={`notif-who ic-${n.icone}`} aria-hidden="true"><span className="tile-ic notif-tile"><Icon name={n.icone} size={20} fill /></span></span>
                  <span className="grow"><span className="notif-t">{n.texte}</span><span className="small muted">{n.afaire ? 'À faire' : 'Nouveau'}{n.quand ? ` · ${quand(n.quand)}` : ''}</span></span>
                  <span className="notif-go"><Icon name="down" size={14} /></span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

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
  const [pop, setPop] = useState<'compte' | 'notifs' | null>(null);
  const [palette, setPalette] = useState(false);
  const [notifs, setNotifs] = useState<Notif[] | null>(null);
  const [vu, setVu] = useState(0);
  const compte = pop === 'compte';
  const setCompte = (v: boolean | ((c: boolean) => boolean)) => setPop(p => ((typeof v === 'function' ? v(p === 'compte') : v) ? 'compte' : null));
  const [collapsed, setCollapsed] = useState(false);
  const recharger = useCallback(() => {
    fetch('/api/espace/moi').then(r => { if (r.status === 401) { window.location.href = '/connexion'; return null; } return r.json(); }).then(m => m && setMoi(m)).catch(() => {});
  }, []);
  const chargerNotifs = useCallback(() => { fetch('/api/espace/notifications').then(r => (r.ok ? r.json() : [])).then(setNotifs).catch(() => {}); }, []);
  useEffect(() => { try { setCollapsed(localStorage.getItem('cc:menu-membre') === '1'); } catch { /* navigation privée */ } }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(true); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  const naviguer = useCallback(() => { setOpen(false); setPop(null); setPalette(false); recharger(); chargerNotifs(); }, [recharger, chargerNotifs]);
  const marquerVues = (cles: string[]) => {
    const actuelles = new Set((notifs ?? []).map(n => n.cle));
    try { localStorage.setItem(VUES, JSON.stringify([...new Set([...vues().filter(c => actuelles.has(c)), ...cles])])); } catch { /* */ }
    setVu(v => v + 1);
  };
  const nNotifs = vu >= 0 && notifs ? notifs.filter(n => !vues().includes(n.cle)).length : 0;
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
              <div className="lbl"><b>CanCham Madagascar</b><span>propulsé par L’Alliée Virtuelle</span></div>
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
              <button type="button" className="search" onClick={() => setPalette(true)} aria-label="Rechercher">
                <Icon name="search" size={16} /><span>Rechercher un membre, un événement…</span><kbd>Ctrl K</kbd>
              </button>
              <div className="sp" />
              <Link className="btn cta es-ecrire" href="/espace/messagerie?ecrire=1"><Icon name="compose" size={16} /><span className="lbl2">Écrire à la Chambre</span></Link>
              <Link className="tb-btn ring" href="/espace/messagerie" title="Messagerie" aria-label={moi?.messages ? `Messagerie, ${moi.messages} non lu(s)` : 'Messagerie'}>
                <Icon name="chat" size={18} />{!!moi?.messages && <span className="bell-dot">{moi.messages}</span>}
              </Link>
              <button type="button" className="tb-btn ring" title="Notifications" aria-label={nNotifs ? `Notifications, ${nNotifs} nouvelle(s)` : 'Notifications'} aria-expanded={pop === 'notifs'}
                onClick={() => setPop(p => (p === 'notifs' ? null : 'notifs'))}>
                <Icon name="bell" size={18} />{nNotifs > 0 && <span className="bell-dot">{nNotifs}</span>}
              </button>
              <button type="button" className="me" aria-expanded={compte} onClick={() => setCompte(c => !c)} title={moi?.entreprise} aria-label="Mon compte">
                {moi ? <Avatar kind="member" id={moi.member_id} size={38} nom={moi.entreprise} /> : '?'}
              </button>
            </header>
            <main className="main"><div className="content">{children}</div></main>
          </div>
        </div>
        {open && <div className="pop-bg" onClick={() => setOpen(false)} />}
        {pop === 'notifs' && <><div className="pop-bg" onClick={() => setPop(null)} /><Notifications liste={notifs} onVu={marquerVues} onClose={() => setPop(null)} /></>}
        {palette && <Palette onClose={() => setPalette(false)} pages={PAGES} actions={ACTIONS} source="/api/espace/recherche" invite="Rechercher un membre, un service, un événement, une actualité…" />}
        {compte && moi && <>
          <div className="pop-bg" onClick={() => setCompte(false)} />
          <div className="npanel pop" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="row" style={{ flexWrap: 'nowrap' }}><Avatar kind="member" id={moi.member_id} size={44} nom={moi.entreprise} />
              <div><b>{moi.nom}</b><div className="small muted">{moi.email}</div><div className="small muted">{moi.entreprise}{moi.fonction ? ` · ${moi.fonction}` : ''}</div></div></div>
            <Link className="btn" href="/espace/profil" onClick={() => setCompte(false)}><Icon name="store" size={16} /> Mon entreprise</Link>
            <button className="btn" onClick={sortir}><Icon name="logout" size={16} /> Se déconnecter</button>
          </div>
        </>}
        <Toaster />
      </div>
    </Ctx.Provider>
  );
}
