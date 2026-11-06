'use client';
import { useEffect, useRef, useState } from 'react';

// Pagination des listes longues : 10 lignes, 50 lignes ou tout, au choix.
// Le choix est le même pour toutes les listes et reste mémorisé dans ce navigateur.
const TAILLES = [10, 50, 0] as const;            // 0 : tout afficher
type Taille = typeof TAILLES[number];
const CLE = 'cc:par-page';
const EVT = 'cc:par-page';
const lire = (): Taille => { try { const s = localStorage.getItem(CLE), v = Number(s); return s !== null && (TAILLES as readonly number[]).includes(v) ? v as Taille : 10; } catch { return 10; } };

// cle : change quand un filtre ou une recherche change → retour à la première page
export function usePage<T>(liste: T[], cle: unknown = '') {
  const [page, setPage] = useState(0);
  const [par, setParState] = useState<Taille>(10);
  useEffect(() => {
    setParState(lire());
    const maj = () => { setParState(lire()); setPage(0); };
    window.addEventListener(EVT, maj);
    return () => window.removeEventListener(EVT, maj);
  }, []);
  const k = JSON.stringify(cle);
  useEffect(() => setPage(0), [k]);
  const n = par || liste.length || 1;
  const pages = Math.max(1, Math.ceil(liste.length / n));
  const p = Math.min(page, pages - 1);           // après une suppression, on ne reste pas sur une page vide
  const setPar = (t: Taille) => { try { localStorage.setItem(CLE, String(t)); } catch { /* navigation privée */ } setParState(t); setPage(0); window.dispatchEvent(new Event(EVT)); };
  return { items: par ? liste.slice(p * n, (p + 1) * n) : liste, page: p, pages, total: liste.length, par, setPar, setPage };
}

// « 11–20 sur 103 membres · Afficher 10 · 50 · Tout · ‹ Précédent · Page 2 / 11 · Suivant › »
export function Pager({ p, quoi = 'lignes' }: { p: ReturnType<typeof usePage>; quoi?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  if (p.total <= TAILLES[0]) return null;
  const remonter = () => {
    const haut = ref.current?.closest('section, .card, .og-panel') as HTMLElement | null;
    if (haut && haut.getBoundingClientRect().top < 0) window.scrollTo({ top: window.scrollY + haut.getBoundingClientRect().top - 84 });
  };
  const aller = (n: number) => { p.setPage(n); remonter(); };
  return (
    <div className="pager" ref={ref}>
      <span>{p.par ? `${p.page * p.par + 1}–${Math.min(p.total, (p.page + 1) * p.par)} sur ${p.total}` : `${p.total}`} {quoi}</span>
      <div className="row">
        <span className="pager-taille" role="group" aria-label="Lignes par page">Afficher
          {TAILLES.map(t => <button key={t} type="button" className={`fchip${p.par === t ? ' on' : ''}`} aria-pressed={p.par === t} onClick={() => { p.setPar(t); remonter(); }}>{t || 'Tout'}</button>)}
        </span>
        {p.par > 0 && p.pages > 1 && <>
          <button type="button" className="btn sm" disabled={p.page === 0} onClick={() => aller(p.page - 1)}>‹ Précédent</button>
          <span>Page {p.page + 1} / {p.pages}</span>
          <button type="button" className="btn sm" disabled={p.page >= p.pages - 1} onClick={() => aller(p.page + 1)}>Suivant ›</button>
        </>}
      </div>
    </div>
  );
}
