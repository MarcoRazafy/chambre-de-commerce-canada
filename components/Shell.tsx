'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NAV, type NavItem } from '@/lib/resources';
import { IC } from '@/lib/icons';

export const Icon = ({ name, size = 17 }: { name: string; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: IC[name] ?? '' }} />
);

function Badge({ badge, demandes }: { badge: NavItem['badge']; demandes: number }) {
  if (badge === 'demandes') return demandes ? <span className="badge-n" title="Demandes à examiner">{demandes}</span> : null;
  if (badge === 'new') return <span className="badge-new">Nouveau</span>;
  if (badge === 'up') return <span className="badge-up">Amélioré</span>;
  return null;
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [demandes, setDemandes] = useState(0);
  useEffect(() => {
    setOpen(false);
    fetch('/api/members').then(r => (r.ok ? r.json() : [])).then((ms: { statut: string }[]) => setDemandes(ms.filter(m => m.statut === 'demande').length)).catch(() => {});
  }, [path]);

  return (
    <>
      <header className="top">
        <button className="tb-btn" aria-label="Ouvrir le menu" onClick={() => setOpen(o => !o)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
        <div className="sp" />
        <Link className="tb-btn" href="/notifications" aria-label="Notifications"><Icon name="bell" size={19} /></Link>
      </header>
      <div className="app">
        <aside className={`side${open ? ' open' : ''}`} id="side" aria-label="Menu du back-office">
          <div className="brand"><div className="brand-mark">CC</div><div><b>CanCham Connect</b><span>Back-office · version 2</span></div></div>
          <nav>
            {NAV.map(([group, items]) => (
              <div className="nav-g" key={group}>
                <div className="eyebrow">{group}</div>
                {items.map(i => (
                  <Link key={i.slug} href={'/' + i.slug} className={path === '/' + i.slug ? 'on' : ''}>
                    <Icon name={i.icon} /><span>{i.label}</span><Badge badge={i.badge} demandes={demandes} />
                  </Link>
                ))}
              </div>
            ))}
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
