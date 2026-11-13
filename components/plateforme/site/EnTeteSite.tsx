"use client";

// En-tête du site de la plateforme : reste en haut en défilant (une ombre apparaît dès que la page a bougé) ; sur
// l'accueil, le lien de la section à l'écran est souligné ; sur téléphone, le menu s'ouvre sous l'en-tête
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { MarqueSite } from "@/components/plateforme/site/MarqueSite";

export const LIENS_SITE = [
  { href: "/#fonctions", libelle: "Fonctions" },
  { href: "/#fonctionnement", libelle: "Fonctionnement" },
  { href: "/tarifs", libelle: "Tarifs" },
  { href: "/#questions", libelle: "Questions" },
];

// Sections de l'accueil suivies par l'en-tête
const SECTIONS = ["fonctions", "fonctionnement", "tarifs", "questions"];

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
const SOULIGNE =
  "after:absolute after:left-3 after:right-3 after:bottom-1.5 after:h-0.5 after:rounded-full after:bg-[#ff8a8a] after:origin-left after:scale-x-0 after:transition-transform after:duration-300 after:ease-[var(--site-ease)]";

export function EnTeteSite() {
  const chemin = usePathname();
  const [ouvert, setOuvert] = useState(false);
  const [section, setSection] = useState("");
  const entete = useRef<HTMLElement>(null);

  // Une ombre sous l'en-tête dès que la page a défilé
  useEffect(() => {
    const el = entete.current;
    if (!el) return;
    const maj = () => el.toggleAttribute("data-defile", window.scrollY > 4);
    maj();
    window.addEventListener("scroll", maj, { passive: true });
    return () => window.removeEventListener("scroll", maj);
  }, []);

  // Sur l'accueil : la section qui passe au milieu de l'écran donne le lien souligné
  useEffect(() => {
    if (chemin !== "/" || !("IntersectionObserver" in window)) return;
    const cibles = SECTIONS.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    const obs = new IntersectionObserver(
      (entrees) => {
        for (const e of entrees) {
          if (e.isIntersecting) setSection(e.target.id);
          else setSection((s) => (s === e.target.id ? "" : s));
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    cibles.forEach((c) => obs.observe(c));
    return () => obs.disconnect();
  }, [chemin]);

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

  // Le lien actif : la page ouverte, ou la section à l'écran sur l'accueil
  const actif = (href: string) => {
    if (chemin !== "/") return href === chemin;
    return href === "/tarifs" ? section === "tarifs" : href === `/#${section}`;
  };

  return (
    <header
      ref={entete}
      className="sur-sombre sticky top-0 z-50 border-b border-white/10 bg-marque-nuit text-white transition-shadow duration-300 data-defile:shadow-[0_8px_24px_rgba(15,29,44,0.28)]"
    >
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 h-16 flex items-center gap-4">
        <MarqueSite clair />

        <nav aria-label="Sections du site" className="hidden lg:flex items-center gap-1 ml-8">
          {LIENS_SITE.map((l) => {
            const a = actif(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={a ? (chemin === "/" && l.href !== "/tarifs" ? "location" : "page") : undefined}
                className={`relative inline-flex items-center min-h-[44px] px-3 rounded-lg text-[15px] no-underline transition-colors hover:text-white hover:bg-white/10 ${SOULIGNE} ${
                  a ? "text-white after:scale-x-100" : "text-white/75"
                } ${FOCUS}`}
              >
                {l.libelle}
              </Link>
            );
          })}
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
            {LIENS_SITE.map((l, i) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOuvert(false)}
                style={{ animationDelay: `${i * 40}ms` }}
                className={`entree py-3 text-[16px] font-medium text-white no-underline border-b border-white/10 last:border-b-0 ${FOCUS}`}
              >
                {l.libelle}
              </Link>
            ))}
          </nav>
          <div className="entree max-w-[1200px] mx-auto px-5 sm:px-8 pb-5 pt-2 grid gap-2 sm:hidden" style={{ animationDelay: "160ms" }}>
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
