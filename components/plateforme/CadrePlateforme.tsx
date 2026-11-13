import type { ReactNode } from "react";
import { EnTeteSite } from "@/components/plateforme/site/EnTeteSite";
import { Illustration, type NomIllustration } from "@/components/plateforme/site/Illustration";

// Cadre des pages du site de la plateforme (créer une Chambre, devenir membre, se connecter, démarrage) :
// l'en-tête du site (ou « entete » à sa place), un fond calme, une carte blanche ; « illustration » : à droite sur
// grand écran
export function CadrePlateforme({ large = false, entete, illustration, children }: { large?: boolean; entete?: ReactNode; illustration?: NomIllustration; children: ReactNode }) {
  const colonne = large ? "max-w-[908px]" : "max-w-[608px]";
  return (
    <div className="site-plateforme min-h-dvh flex flex-col bg-bg text-ink">
      {entete ?? <EnTeteSite />}
      {illustration ? (
        <main className={`entree flex-1 w-full mx-auto px-4 sm:px-6 py-10 sm:py-16 grid gap-12 xl:items-center ${large ? "max-w-[1360px] xl:grid-cols-[minmax(0,908px)_minmax(0,1fr)]" : "max-w-[1100px] xl:grid-cols-[minmax(0,608px)_minmax(0,1fr)]"}`}>
          <div className={`w-full mx-auto xl:mx-0 ${colonne}`}>{children}</div>
          <Illustration nom={illustration} className="hidden xl:block w-full max-w-[420px] justify-self-center" />
        </main>
      ) : (
        <main className={`entree flex-1 w-full mx-auto px-4 sm:px-6 py-10 sm:py-16 ${colonne}`}>{children}</main>
      )}
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
