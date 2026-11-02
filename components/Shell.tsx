'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NAV } from '@/lib/resources';

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);

  return (
    <>
      <header className="top">
        <button className="tb-btn" aria-label="Ouvrir le menu" onClick={() => setOpen(o => !o)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
        <div className="sp" />
        <Link className="tb-btn" href="/notifications" aria-label="Notifications">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
        </Link>
      </header>
      <div className="app">
        <aside className={`side${open ? ' open' : ''}`} aria-label="Menu du back-office">
          <div className="brand"><div className="brand-mark">CC</div><div><b>CanCham Connect</b><span>Back-office</span></div></div>
          <nav>
            {NAV.map(([group, items]) => (
              <div className="nav-g" key={group}>
                <div className="eyebrow">{group}</div>
                {items.map(([slug, label]) => (
                  <Link key={slug} href={'/' + slug} className={path === '/' + slug ? 'on' : ''}>{label}</Link>
                ))}
              </div>
            ))}
          </nav>
        </aside>
        <main className="main"><div className="content">{children}</div></main>
      </div>
    </>
  );
}
