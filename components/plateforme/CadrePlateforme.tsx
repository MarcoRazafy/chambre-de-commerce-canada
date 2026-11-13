import type { ReactNode } from "react";
import { EnTeteSite } from "@/components/plateforme/site/EnTeteSite";

// Cadre des pages du site de la plateforme (créer une Chambre, devenir membre, se connecter, démarrage) :
// l'en-tête du site (ou « entete » à sa place), un fond calme, une carte blanche
export function CadrePlateforme({ large = false, entete, children }: { large?: boolean; entete?: ReactNode; children: ReactNode }) {
  return (
    <div className="site-plateforme min-h-dvh flex flex-col bg-bg text-ink">
      {entete ?? <EnTeteSite />}
      <main className={`entree flex-1 w-full mx-auto px-4 sm:px-6 py-10 sm:py-16 ${large ? "max-w-[908px]" : "max-w-[608px]"}`}>{children}</main>
      <p className="text-[13px] text-faint text-center m-0 py-6 border-t border-line bg-surface">© {new Date().getFullYear()} L’Alliée Virtuelle</p>
    </div>
  );
}

// La carte blanche des formulaires
export function CartePlateforme({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface shadow-[0_8px_24px_rgba(0,0,0,0.06)] px-6 py-8 sm:px-10 sm:py-10">
      {children}
    </div>
  );
}
