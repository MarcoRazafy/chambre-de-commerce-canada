"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import { ChevronDown, Menu, Search } from "lucide-react";
import { BoutonDeconnexion } from "@/components/BoutonDeconnexion";
import { BoutonInstaller } from "@/components/Application";
import { MenuNotifications } from "@/components/MenuNotifications";
import { EnCoursLien, TirerPourRafraichir } from "@/components/Mouvement";
import { FilAriane } from "@/components/FilAriane";
import { NAV_ICONS } from "@/components/nav-icons";
import type { NavGroup } from "@/lib/nav";
import type { Notification } from "@/lib/notifications";
import type { Member, User } from "@/lib/types";

interface CoquilleProps {
  user: User;
  membre: Member;
  nav: NavGroup[];
  badges?: Record<string, number>;
  lockedHrefs?: string[];
  notifications?: Notification[];
  bandeau?: ReactNode;
  children: ReactNode;
}

export function Coquille({
  user,
  membre,
  nav,
  badges = {},
  lockedHrefs = [],
  notifications = [],
  bandeau,
  children,
}: CoquilleProps) {
  const pathname = usePathname();
  const [menuOuvert, setMenuOuvert] = useState(false);


  return (
    <div className="espace-membre flex min-h-screen">
      {menuOuvert ? (
        <button
          aria-label="Fermer le menu"
          onClick={() => setMenuOuvert(false)}
          className="fixed inset-0 bg-black/55 z-35 lg:hidden anim-fondu"
        />
      ) : null}

      <aside
        className={`print:hidden w-[274px] shrink-0 flex flex-col fixed inset-y-0 left-0 z-40 transition-transform duration-200 ${
          menuOuvert ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
        style={{
          background: "var(--laterale)",
          viewTransitionName: "barre-laterale",
        }}
      >
        <div className="px-5 pt-7 pb-6">
          <Link
            href="/membre"
            className="no-underline block"
            aria-label="IMPACT 261"
          >
            <Image
              src="/marque/logo-blanc.png"
              alt="IMPACT 261"
              width={1600}
              height={647}
              priority
              sizes="170px"
              className="w-[170px] max-w-full h-auto"
            />
          </Link>
        </div>

        <nav className="defilement-sombre flex-1 overflow-y-auto px-3.5 pb-4">
          {nav.map((groupe, i) => (
            <div
              key={groupe.label || `groupe-${i}`}
              className={i > 0 ? "mt-5 pt-5 border-t border-white/10" : ""}
            >
              {groupe.label ? (
                <div className="surtitre text-white/40 mx-3 mb-2.5">
                  {groupe.label}
                </div>
              ) : null}

              {groupe.items.map((item) => {
                const Icone = NAV_ICONS[item.icon] ?? NAV_ICONS.home;
                const Cadenas = NAV_ICONS.lock;
                const cible = item.href.split("?")[0];
                const raccourci = item.href.includes("?");
                const actif =
                  !raccourci &&
                  [cible, ...(item.aussi ?? [])].some(
                    (h) => pathname === h || (h !== "/membre" && pathname.startsWith(`${h}/`)),
                  );
                const verrouille = lockedHrefs.includes(item.href);
                const badge = badges[item.href];

                if (verrouille) {
                  return (
                    <span
                      key={item.href}
                      title="Accès ouvert dès le règlement de votre cotisation"
                      className="flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-lg text-[14px] opacity-35 cursor-not-allowed"
                    >
                      <Cadenas size={18} className="shrink-0" />
                      <span>{item.label}</span>
                    </span>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOuvert(false)}
                    className={`entree-menu flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-lg text-[14px] no-underline transition-colors ${
                      actif
                        ? "entree-menu-actif bg-accent text-white font-semibold shadow-[0_2px_10px_-2px_rgba(173,7,7,0.6)]"
                        : "text-white/70 hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    <Icone size={18} className="shrink-0 opacity-90" />
                    <span className="flex-1">{item.label}</span>
                    <EnCoursLien />
                    {badge ? (
                      <span className="pastille text-[11px] font-bold w-[22px] h-[22px] rounded-full bg-accent text-white flex items-center justify-center">
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
          href="/membre/profil"
          className="mx-3.5 mb-1 mt-1 px-3 py-3 rounded-lg flex items-center gap-3 border-t-2 border-success pt-4 no-underline hover:bg-white/[0.06]"
        >
          <Avatar user={user} taille={40} neutre />
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-semibold text-white truncate">
              {abreger(user.nom)}
            </span>
            <span className="block text-[11.5px] text-white/50 truncate">
              {membre.nom}
            </span>
          </span>
          <ChevronDown size={16} className="text-white/45 shrink-0" />
        </Link>

        <BoutonDeconnexion />
      </aside>

      <div className="flex-1 min-w-0 flex flex-col lg:ml-[274px] print:ml-0">
        <header
          className="print:hidden sticky top-0 z-30 border-b border-white/10 flex items-center gap-4 px-4 md:px-7 py-3 text-white"
          style={{
            background: "var(--superieure)",
            viewTransitionName: "barre-superieure",
          }}
        >
          <button
            onClick={() => setMenuOuvert((v) => !v)}
            aria-label="Ouvrir le menu"
            className="lg:hidden border border-white/20 bg-white/10 text-white rounded-lg p-2 cursor-pointer"
          >
            <Menu size={18} />
          </button>

          <FilAriane racine="/membre" />

          <Suspense fallback={<div className="flex-1" />}>
            <Recherche />
          </Suspense>

          <div className="flex items-center gap-2 shrink-0">
            <BoutonInstaller />
            <MenuNotifications notifications={notifications} />

            <Link
              href="/membre/profil"
              className="no-underline block"
              aria-label="Mon profil"
            >
              <Avatar user={user} taille={36} neutre />
            </Link>
          </div>
        </header>

        <main className="px-4 md:px-6 pt-6 pb-12 max-w-[1600px] w-full mx-auto print:p-0">
          <TirerPourRafraichir />
          {bandeau && !pathname.startsWith("/membre/cotisations") ? (
            <div className="mb-5 print:hidden">{bandeau}</div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}

function abreger(nom: string): string {
  const mots = nom.trim().split(/\s+/);
  if (mots.length < 2) return nom;
  return `${mots[0]} ${mots[mots.length - 1][0]}.`;
}

function Avatar({
  user,
  taille,
  neutre = false,
}: {
  user: User;
  taille: number;
  neutre?: boolean;
}) {
  if (user.photo) {
    return (
      <span
        className={`rounded-full overflow-hidden shrink-0 block border ${
          neutre ? "border-white/25" : "border-accent/40"
        }`}
        style={{ width: taille, height: taille }}
      >
        <Image
          src={user.photo}
          alt={user.nom}
          width={taille}
          height={taille}
          sizes={`${taille}px`}
          className="w-full h-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className={`rounded-full flex items-center justify-center font-bold shrink-0 ${
        neutre
          ? "bg-white/15 text-white border border-white/25"
          : "bg-accent-soft text-accent-strong border border-accent/40"
      }`}
      style={{ width: taille, height: taille, fontSize: taille * 0.36 }}
    >
      {user.initiales}
    </span>
  );
}

function Recherche() {
  const pathname = usePathname();
  const params = useSearchParams();
  const surRecherche = pathname === "/membre/recherche";

  return (
    <form
      action="/membre/recherche"
      className="flex-1 flex justify-center px-2"
    >
      <div className="relative w-full max-w-[420px]">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/45 pointer-events-none"
        />
        <input
          type="search"
          name="q"
          defaultValue={surRecherche ? (params.get("q") ?? "") : ""}
          placeholder="Rechercher dans le réseau…"
          aria-label="Rechercher dans le réseau"
          className="w-full border border-white/20 bg-white/10 text-white placeholder:text-white/45 rounded-lg pl-10 pr-3 py-2.5 text-[13.5px] outline-none focus:border-white/45 focus:bg-white/15"
        />
      </div>
    </form>
  );
}

