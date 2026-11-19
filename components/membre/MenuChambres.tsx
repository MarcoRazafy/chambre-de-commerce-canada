"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeftRight, Check, UserRound } from "lucide-react";
import { LogoChambre } from "@/components/gm/LogoChambre";
import { basculerCompte } from "@/lib/actions/auth";

export type ChambreDuCompte = { id: string; chambre: string; logo: string | null; logoFond: string | null; role: string };

const ENTREE = "flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-semibold text-ink text-left no-underline bg-transparent border-0 cursor-pointer hover:bg-surface-2";

export function MenuChambres({ nom, avatar, actuelle, autres }: { nom: string; avatar: ReactNode; actuelle: ChambreDuCompte; autres: ChambreDuCompte[] }) {
  const [ouvert, setOuvert] = useState(false);
  const zone = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    const fermer = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !zone.current?.contains(e.target as Node)) setOuvert(false);
    };
    document.addEventListener("pointerdown", fermer);
    document.addEventListener("keydown", fermer);
    return () => {
      document.removeEventListener("pointerdown", fermer);
      document.removeEventListener("keydown", fermer);
    };
  }, [ouvert]);

  return (
    <div ref={zone} className="relative">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={ouvert}
        aria-label="Profil et Chambres"
        className="block p-0 bg-transparent border-0 cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-white"
      >
        {avatar}
      </button>
      {ouvert ? (
        <div role="menu" className="anim-echelle origin-top-right absolute right-0 top-12 z-50 w-[300px] bg-surface text-ink border border-line rounded-[var(--radius-m)] shadow-[0_18px_48px_-18px_rgba(15,29,44,0.55)] overflow-hidden">
          <div className="p-1.5">
            <Link role="menuitem" href="/membre/profil" onClick={() => setOuvert(false)} className={ENTREE}>
              <span className="grid place-items-center w-10 shrink-0 text-muted">
                <UserRound size={18} aria-hidden />
              </span>
              <span className="truncate">{nom}</span>
            </Link>
          </div>
          <div className="border-t border-line p-1.5 flex flex-col gap-0.5">
            <div role="menuitem" aria-current="true" className={`${ENTREE} cursor-default bg-surface-2 hover:bg-surface-2`}>
              <LogoChambre nom={actuelle.chambre} logo={actuelle.logo} fond={actuelle.logoFond} taille={28} />
              <span className="min-w-0 flex-1 truncate">{actuelle.chambre}</span>
              <Check size={16} className="shrink-0 text-success" aria-label="Chambre actuelle" />
            </div>
            {autres.map((c) => (
              <form key={c.id} action={basculerCompte}>
                <input type="hidden" name="compte" value={c.id} />
                <button role="menuitem" type="submit" title={`Basculer vers ${c.chambre}`} className={ENTREE}>
                  <LogoChambre nom={c.chambre} logo={c.logo} fond={c.logoFond} taille={28} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{c.chambre}</span>
                    {c.role === "admin" ? <span className="block text-[12px] font-normal text-muted">Espace équipe</span> : null}
                  </span>
                  <ArrowLeftRight size={16} className="shrink-0 text-muted" aria-hidden />
                </button>
              </form>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
