import type { Metadata } from "next";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { NavGM } from "@/components/gm/NavGM";
import { deconnexionGM } from "@/lib/actions/gm";
import { exigerGM } from "@/lib/gm";

export const metadata: Metadata = { title: { default: "Admin GM", template: "%s · Admin GM" } };

// Espace de l'Admin GM : les Chambres clientes de la plateforme et les offres
export default async function EspaceGM({ children }: { children: React.ReactNode }) {
  const gm = await exigerGM();
  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-marque-nuit text-white">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 h-16 flex items-center gap-4 sm:gap-6">
          <Link href="/gm/chambres" className="no-underline text-white font-bold text-[15px] whitespace-nowrap">
            L’Alliée Virtuelle <span className="text-white/55 font-semibold max-sm:hidden">· Admin GM</span>
          </Link>
          <NavGM />
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[13px] text-white/70 max-md:hidden">{gm.nom}</span>
            <form action={deconnexionGM}>
              <button type="submit" aria-label="Se déconnecter" className="inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius-s)] text-[13px] font-semibold text-white/80 bg-transparent border-0 cursor-pointer hover:text-white hover:bg-white/10">
                <LogOut size={16} aria-hidden /> <span className="max-sm:hidden">Se déconnecter</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-[1180px] mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
