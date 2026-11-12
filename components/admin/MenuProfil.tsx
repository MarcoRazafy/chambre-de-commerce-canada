"use client";

// Avatar de la barre du haut : un clic ouvre Mon profil, Paramètres et Se déconnecter
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LogOut, Settings, UserRound } from "lucide-react";
import { deconnexion } from "@/lib/actions/auth";

const ENTREE = "flex w-full items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] font-semibold no-underline bg-transparent border-0 cursor-pointer hover:bg-surface-2";

export function MenuProfil({ nom, fonction, avatar }: { nom: string; fonction: string; avatar: ReactNode }) {
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
        aria-label="Menu du profil"
        className="block p-0 bg-transparent border-0 cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-white"
      >
        {avatar}
      </button>
      {ouvert ? (
        <div role="menu" className="anim-echelle origin-top-right absolute right-0 top-12 z-50 w-[240px] bg-surface text-ink border border-line rounded-[var(--radius-m)] shadow-[0_18px_48px_-18px_rgba(15,29,44,0.55)] overflow-hidden">
          <div className="h-1" style={{ background: "var(--marque-degrade)" }} aria-hidden="true" />
          <div className="px-4 py-3 border-b border-line">
            <div className="text-[14px] font-bold truncate">{nom}</div>
            <div className="text-[12px] text-muted truncate">{fonction}</div>
          </div>
          <div className="p-1.5 flex flex-col">
            <Link role="menuitem" href="/admin/profil" onClick={() => setOuvert(false)} className={`${ENTREE} text-ink`}>
              <UserRound size={16} className="text-muted" /> Mon profil
            </Link>
            <Link role="menuitem" href="/admin/parametres" onClick={() => setOuvert(false)} className={`${ENTREE} text-ink`}>
              <Settings size={16} className="text-muted" /> Paramètres
            </Link>
            <form action={deconnexion} className="border-t border-line mt-1 pt-1">
              <button role="menuitem" type="submit" className={`${ENTREE} text-bad`}>
                <LogOut size={16} /> Se déconnecter
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
