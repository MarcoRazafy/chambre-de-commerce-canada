"use client";

// En-tête du site de la plateforme : reste en haut en défilant ; sur téléphone, le menu s'ouvre sous l'en-tête
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { MarqueSite } from "@/components/plateforme/site/MarqueSite";

export const LIENS_SITE = [
  { href: "/#fonctions", libelle: "Fonctions" },
  { href: "/#fonctionnement", libelle: "Fonctionnement" },
  { href: "/tarifs", libelle: "Tarifs" },
  { href: "/#questions", libelle: "Questions" },
];

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

export function EnTeteSite() {
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    if (!ouvert) return;
    const touche = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    const largeur = window.matchMedia("(min-width: 1024px)");
    const fermer = () => largeur.matches && setOuvert(false);
    document.addEventListener("keydown", touche);
    largeur.addEventListener("change", fermer);
    return () => {
      document.removeEventListener("keydown", touche);
      largeur.removeEventListener("change", fermer);
    };
  }, [ouvert]);

  return (
    <header className="sur-sombre sticky top-0 z-50 border-b border-white/10 bg-marque-nuit text-white">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 h-16 flex items-center gap-4">
        <MarqueSite clair />

        <nav aria-label="Sections du site" className="hidden lg:flex items-center gap-1 ml-8">
          {LIENS_SITE.map((l) => (
            <Link key={l.href} href={l.href} className={`inline-flex items-center min-h-[44px] px-3 rounded-lg text-[15px] text-white/75 no-underline transition-colors hover:text-white hover:bg-white/10 ${FOCUS}`}>
              {l.libelle}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/connexion" className={`hidden sm:inline-flex items-center min-h-[44px] px-3 rounded-lg text-[15px] font-medium text-white no-underline transition-colors hover:bg-white/10 ${FOCUS}`}>
            Se connecter
          </Link>
          <span className="hidden sm:inline-flex">
            <Link href="/creer-une-chambre" className={`btn-action btn-action-sm ${FOCUS}`}>
              Créer ma Chambre
            </Link>
          </span>
          <button
            type="button"
            onClick={() => setOuvert((o) => !o)}
            aria-expanded={ouvert}
            aria-controls="menu-site"
            aria-label={ouvert ? "Fermer le menu" : "Ouvrir le menu"}
            className={`lg:hidden w-11 h-11 -mr-2 rounded-lg flex items-center justify-center bg-transparent border-0 text-white cursor-pointer transition-colors hover:bg-white/10 ${FOCUS}`}
          >
            {ouvert ? <X size={22} strokeWidth={1.5} aria-hidden /> : <Menu size={22} strokeWidth={1.5} aria-hidden />}
          </button>
        </div>
      </div>

      {ouvert ? (
        <div id="menu-site" className="lg:hidden border-t border-white/10 bg-marque-nuit anim-fondu">
          <nav aria-label="Sections du site" className="max-w-[1200px] mx-auto px-5 sm:px-8 py-2 flex flex-col">
            {LIENS_SITE.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOuvert(false)} className={`py-3 text-[16px] font-medium text-white no-underline border-b border-white/10 last:border-b-0 ${FOCUS}`}>
                {l.libelle}
              </Link>
            ))}
          </nav>
          <div className="max-w-[1200px] mx-auto px-5 sm:px-8 pb-5 pt-2 grid gap-2 sm:hidden">
            <Link href="/creer-une-chambre" onClick={() => setOuvert(false)} className="btn-action w-full">
              Créer ma Chambre
            </Link>
            <Link href="/connexion" onClick={() => setOuvert(false)} className="btn-contour w-full">
              Se connecter
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
