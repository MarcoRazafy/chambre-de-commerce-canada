"use client";

// Coquille de l'espace Admin GM : la même que celle du back-office (barre latérale à gauche, barre du haut),
// aux couleurs de la plateforme : menu, Paramètres en pied, compte de l'Admin GM, déconnexion.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LogOut, Menu, Settings } from "lucide-react";
import { EnCoursLien } from "@/components/Mouvement";
import { FilAriane } from "@/components/FilAriane";
import { NAV_ICONS } from "@/components/nav-icons";
import { deconnexionGM } from "@/lib/actions/gm";
import type { NavGroup } from "@/lib/nav";

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70";
const ENTREE = `entree-menu flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-lg text-[14px] no-underline transition-colors ${FOCUS}`;
const ACTIVE = "entree-menu-actif bg-accent text-white font-semibold shadow-[0_2px_10px_-2px_rgba(173,7,7,0.6)]";
const REPOS = "text-white/70 hover:bg-white/[0.08] hover:text-white";

const initiales = (nom: string) =>
  nom.split(/\s+/).filter(Boolean).map((m) => m[0]).slice(0, 2).join("").toUpperCase() || "A";

function Portrait({ nom, taille }: { nom: string; taille: number }) {
  return (
    <span
      className="rounded-full flex items-center justify-center font-bold shrink-0 bg-white/15 text-white border border-white/25"
      style={{ width: taille, height: taille, fontSize: taille * 0.36 }}
      aria-hidden="true"
    >
      {initiales(nom)}
    </span>
  );
}

export function CoquilleGM({
  gm,
  nav,
  badges = {},
  children,
}: {
  gm: { nom: string; email: string };
  nav: NavGroup[];
  badges?: Record<string, number>;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [menuOuvert, setMenuOuvert] = useState(false);
  const actif = (href: string) => pathname === href || (href !== "/gm" && pathname.startsWith(`${href}/`));

  return (
    <div className="espace-admin flex min-h-screen">
      {menuOuvert ? (
        <button aria-label="Fermer le menu" onClick={() => setMenuOuvert(false)} className="fixed inset-0 bg-black/55 z-35 lg:hidden anim-fondu" />
      ) : null}

      <aside
        className={`print:hidden w-[274px] shrink-0 flex flex-col fixed inset-y-0 left-0 z-40 text-white transition-transform duration-200 ${
          menuOuvert ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
        style={{ background: "var(--laterale)", viewTransitionName: "barre-laterale" }}
      >
        <div className="px-5 pt-7 pb-5">
          <Link href="/gm" onClick={() => setMenuOuvert(false)} className={`no-underline block rounded-md ${FOCUS}`} aria-label="Tableau de bord">
            <span className="block text-[21px] font-bold leading-tight text-white">L’Alliée Virtuelle</span>
          </Link>
          <div className="mt-5 flex items-center gap-2.5">
            <span className="surtitre text-white/70">Administrateur</span>
            <span className="h-px flex-1 bg-white/25" />
          </div>
        </div>

        <nav aria-label="Menu de l’espace administrateur" className="defilement-sombre flex-1 overflow-y-auto px-3.5 pb-4">
          {nav.map((groupe, i) => (
            <div key={groupe.label || `groupe-${i}`} className={i > 0 ? "mt-4 pt-4 border-t border-white/[0.08]" : ""}>
              {groupe.label ? <div className="surtitre text-white/35 mx-3 mb-2">{groupe.label}</div> : null}
              {groupe.items.map((item) => {
                const Icone = NAV_ICONS[item.icon] ?? NAV_ICONS.home;
                const courant = actif(item.href);
                const badge = badges[item.href];
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOuvert(false)}
                    aria-current={courant ? "page" : undefined}
                    className={`${ENTREE} ${courant ? ACTIVE : REPOS}`}
                  >
                    <Icone size={18} className="shrink-0 opacity-90" aria-hidden />
                    <span className="flex-1">{item.label}</span>
                    <EnCoursLien />
                    {badge ? (
                      <span
                        aria-label={`${badge} non lu${badge > 1 ? "s" : ""}`}
                        className={`pastille text-[11px] font-bold min-w-[22px] h-[22px] px-1.5 rounded-full flex items-center justify-center ${
                          courant ? "bg-white/25 text-white" : "bg-accent text-white"
                        }`}
                      >
                        {badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <Link
          href="/gm/parametres"
          onClick={() => setMenuOuvert(false)}
          aria-current={actif("/gm/parametres") ? "page" : undefined}
          className={`mx-3.5 mt-2 ${ENTREE} ${actif("/gm/parametres") ? ACTIVE : REPOS}`}
        >
          <Settings size={18} className="shrink-0 opacity-90" aria-hidden />
          <span className="flex-1">Paramètres</span>
        </Link>

        <div className="mx-3.5 mb-1 mt-2 px-3 pt-4 pb-3 flex items-center gap-3 border-t-2 border-success rounded-b-lg">
          <Portrait nom={gm.nom} taille={40} />
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-semibold text-white truncate">{gm.nom}</span>
            <span className="block text-[11.5px] text-white/50 truncate">Administrateur · L’Alliée Virtuelle</span>
          </span>
        </div>

        <form action={deconnexionGM} className="mx-3.5 mb-5">
          <button
            type="submit"
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-[13px] font-semibold text-white/65 hover:text-white hover:bg-white/[0.08] bg-transparent border-0 cursor-pointer ${FOCUS}`}
          >
            <LogOut size={17} className="shrink-0" aria-hidden />
            Se déconnecter
          </button>
        </form>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col lg:ml-[274px] print:ml-0">
        <header
          className="print:hidden sticky top-0 z-30 border-b border-white/10 flex items-center gap-4 px-4 md:px-7 py-3 text-white"
          style={{ background: "var(--superieure)", viewTransitionName: "barre-superieure" }}
        >
          <button
            onClick={() => setMenuOuvert((v) => !v)}
            aria-label="Ouvrir le menu"
            aria-expanded={menuOuvert}
            className={`lg:hidden border border-white/20 bg-white/10 text-white rounded-lg p-2 cursor-pointer ${FOCUS}`}
          >
            <Menu size={18} aria-hidden />
          </button>

          <FilAriane racine="/gm" />
          <div className="flex-1" />

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/gm/parametres"
              aria-label="Paramètres"
              title="Paramètres"
              className={`${ICONE_HAUT} ${actif("/gm/parametres") ? "bg-white/15 text-white" : ""}`}
            >
              <Settings size={17} aria-hidden />
            </Link>
            <MenuCompte gm={gm} />
          </div>
        </header>

        <main className="px-4 md:px-6 pt-6 pb-12 max-w-[1600px] w-full mx-auto print:p-0">{children}</main>
      </div>
    </div>
  );
}

const ICONE_HAUT = `relative w-9 h-9 rounded-lg flex items-center justify-center no-underline text-white/75 hover:text-white hover:bg-white/10 ${FOCUS}`;
const ENTREE_MENU = "flex w-full items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] font-semibold no-underline bg-transparent border-0 cursor-pointer hover:bg-surface-2";

// Avatar de la barre du haut : le compte de l'Admin GM, Paramètres, Se déconnecter
function MenuCompte({ gm }: { gm: { nom: string; email: string } }) {
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
        aria-label="Menu du compte"
        className="block p-0 bg-transparent border-0 cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-white"
      >
        <Portrait nom={gm.nom} taille={36} />
      </button>
      {ouvert ? (
        <div role="menu" className="anim-echelle origin-top-right absolute right-0 top-12 z-50 w-[240px] bg-surface text-ink border border-line rounded-[var(--radius-m)] shadow-[0_18px_48px_-18px_rgba(15,29,44,0.55)] overflow-hidden">
          <div className="h-1" style={{ background: "var(--marque-degrade)" }} aria-hidden="true" />
          <div className="px-4 py-3 border-b border-line">
            <div className="text-[14px] font-bold truncate">{gm.nom}</div>
            <div className="text-[12px] text-muted truncate">{gm.email}</div>
          </div>
          <div className="p-1.5 flex flex-col">
            <Link role="menuitem" href="/gm/parametres" onClick={() => setOuvert(false)} className={`${ENTREE_MENU} text-ink`}>
              <Settings size={16} className="text-muted" aria-hidden /> Paramètres
            </Link>
            <form action={deconnexionGM} className="border-t border-line mt-1 pt-1">
              <button role="menuitem" type="submit" className={`${ENTREE_MENU} text-bad`}>
                <LogOut size={16} aria-hidden /> Se déconnecter
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
