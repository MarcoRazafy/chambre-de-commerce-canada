"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import { ChevronRight, Menu, Search } from "lucide-react";
import { BoutonDeconnexion } from "@/components/BoutonDeconnexion";
import { BoutonInstaller } from "@/components/Application";
import { MenuNotifications } from "@/components/MenuNotifications";
import { EnCoursLien, TirerPourRafraichir } from "@/components/Mouvement";
import { FilAriane } from "@/components/FilAriane";
import { NAV_ICONS } from "@/components/nav-icons";
import type { NavGroup } from "@/lib/nav";
import type { Notification } from "@/lib/notifications";
import type { User } from "@/lib/types";

export function CoquilleAdmin({
  user,
  nav,
  badges = {},
  notifications = [],
  children,
}: {
  user: User;
  nav: NavGroup[];
  badges?: Record<string, number>;
  notifications?: Notification[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [menuOuvert, setMenuOuvert] = useState(false);

  return (
    <div className="espace-admin flex min-h-screen">
      {menuOuvert ? (
        <button
          aria-label="Fermer le menu"
          onClick={() => setMenuOuvert(false)}
          className="fixed inset-0 bg-black/55 z-35 lg:hidden anim-fondu"
        />
      ) : null}

      <aside
        className={`print:hidden w-[274px] shrink-0 flex flex-col fixed inset-y-0 left-0 z-40 text-white transition-transform duration-200 ${
          menuOuvert ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
        style={{
          background: "var(--laterale)",
          viewTransitionName: "barre-laterale",
        }}
      >
        <div className="px-5 pt-7 pb-5">
          <Link
            href="/admin"
            className="no-underline block"
            aria-label="Tableau de bord"
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
          <div className="mt-5 flex items-center gap-2.5">
            <span className="surtitre text-white/70">Back-office</span>
            <span className="h-px flex-1 bg-white/25" />
          </div>
        </div>

        <nav className="defilement-sombre flex-1 overflow-y-auto px-3.5 pb-4">
          {nav.map((groupe, i) => (
            <div
              key={groupe.label || `groupe-${i}`}
              className={i > 0 ? "mt-4 pt-4 border-t border-white/[0.08]" : ""}
            >
              {groupe.label ? (
                <div className="surtitre text-white/35 mx-3 mb-2">
                  {groupe.label}
                </div>
              ) : null}

              {groupe.items.map((item) => {
                const Icone = NAV_ICONS[item.icon] ?? NAV_ICONS.home;
                const actif = [item.href, ...(item.aussi ?? [])].some(
                  (h) => pathname === h || (h !== "/admin" && pathname.startsWith(`${h}/`)),
                );
                const badge = badges[item.href];

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
                      <span
                        className={`pastille text-[11px] font-bold min-w-[22px] h-[22px] px-1.5 rounded-full flex items-center justify-center ${
                          actif
                            ? "bg-white/25 text-white"
                            : "bg-accent text-white"
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
          href="/admin/profil"
          onClick={() => setMenuOuvert(false)}
          title="Mon profil"
          className="mx-3.5 mb-1 mt-2 px-3 pt-4 pb-3 flex items-center gap-3 border-t-2 border-success rounded-b-lg no-underline hover:bg-white/[0.06]"
        >
          <Portrait user={user} taille={40} />
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-semibold text-white truncate">
              {user.nom}
            </span>
            <span className="block text-[11.5px] text-white/50 truncate">
              {user.fonction} · Équipe CanCham
            </span>
          </span>
          <ChevronRight size={16} className="text-white/45 shrink-0" />
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

          <FilAriane racine="/admin" />

          <Suspense fallback={<div className="flex-1" />}>
            <Recherche />
          </Suspense>

          <div className="flex items-center gap-2 shrink-0">
            <BoutonInstaller />
            <MenuNotifications notifications={notifications} />
            <Link
              href="/admin/profil"
              aria-label="Mon profil"
              className="no-underline block"
            >
              <Portrait user={user} taille={36} />
            </Link>
          </div>
        </header>

        <main className="px-4 md:px-6 pt-6 pb-12 max-w-[1600px] w-full mx-auto print:p-0">
          <TirerPourRafraichir />
          {children}
        </main>
      </div>
    </div>
  );
}

function Portrait({ user, taille }: { user: User; taille: number }) {
  if (user.photo) {
    return (
      <span
        className="rounded-full overflow-hidden shrink-0 block border border-white/25"
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
      className="rounded-full flex items-center justify-center font-bold shrink-0 bg-white/15 text-white border border-white/25"
      style={{ width: taille, height: taille, fontSize: taille * 0.36 }}
    >
      {user.initiales}
    </span>
  );
}

function Recherche() {
  const pathname = usePathname();
  const params = useSearchParams();
  const surRecherche = pathname === "/admin/recherche";

  return (
    <form action="/admin/recherche" className="flex-1 flex justify-center px-2">
      <div className="relative w-full max-w-[420px]">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/45 pointer-events-none"
        />
        <input
          type="search"
          name="q"
          defaultValue={surRecherche ? (params.get("q") ?? "") : ""}
          placeholder="Rechercher un membre, un événement…"
          aria-label="Rechercher dans le back-office"
          className="w-full border border-white/20 bg-white/10 text-white placeholder:text-white/45 rounded-lg pl-10 pr-3 py-2.5 text-[13.5px] outline-none focus:border-white/45 focus:bg-white/15"
        />
      </div>
    </form>
  );
}

