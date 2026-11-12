"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard, Layers, Settings } from "lucide-react";

const LIENS = [
  { href: "/gm", libelle: "Tableau de bord", icone: LayoutDashboard },
  { href: "/gm/chambres", libelle: "Chambres", icone: Building2 },
  { href: "/gm/offres", libelle: "Offres", icone: Layers },
  { href: "/gm/parametres", libelle: "Paramètres", icone: Settings },
];

export function NavGM() {
  const chemin = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {LIENS.map(({ href, libelle, icone: Icone }) => {
        // Le tableau de bord (/gm) ne s'allume que pour lui-même
        const actif = chemin === href || (href !== "/gm" && chemin.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={actif ? "page" : undefined}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius-s)] text-[13.5px] font-semibold no-underline ${
              actif ? "bg-white/15 text-white" : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            <Icone size={16} aria-hidden /> <span className="max-sm:hidden">{libelle}</span>
          </Link>
        );
      })}
    </nav>
  );
}
