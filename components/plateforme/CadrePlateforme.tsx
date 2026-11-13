import { EnTeteSite } from "@/components/plateforme/site/EnTeteSite";

// Cadre des pages du site de la plateforme (créer une Chambre, devenir membre, se connecter) :
// l'en-tête du site, un fond clair quadrillé aux couleurs de la plateforme (pas d'une Chambre)
export function CadrePlateforme({ large = false, children }: { large?: boolean; children: React.ReactNode }) {
  return (
    <div className="site-plateforme min-h-dvh flex flex-col bg-[#fbfcfe] text-ink">
      <EnTeteSite />
      <div className="relative flex-1 overflow-hidden">
        <div aria-hidden className="absolute inset-0 site-grille" />
        <div aria-hidden className="absolute -top-32 -left-24 w-[460px] h-[460px] rounded-full blur-3xl opacity-70" style={{ background: "radial-gradient(circle, rgb(173 7 7 / 0.14), transparent 70%)" }} />
        <div aria-hidden className="absolute -bottom-32 -right-24 w-[520px] h-[520px] rounded-full blur-3xl opacity-70" style={{ background: "radial-gradient(circle, rgb(0 113 64 / 0.14), transparent 70%)" }} />
        <main className={`entree relative w-full mx-auto px-4 sm:px-6 py-10 sm:py-14 ${large ? "max-w-[908px]" : "max-w-[608px]"}`}>{children}</main>
      </div>
      <p className="text-[13px] text-faint text-center m-0 py-6 border-t border-line bg-white">© {new Date().getFullYear()} L’Alliée Virtuelle</p>
    </div>
  );
}

// La carte blanche des formulaires
export function CartePlateforme({ children }: { children: React.ReactNode }) {
  return (
    <div className="carte-filet filet-fixe filet-degrade rounded-[var(--radius-l)] border border-line bg-surface shadow-[0_18px_44px_-24px_rgb(15_29_44/0.35)] px-6 py-8 sm:px-10 sm:py-10">
      {children}
    </div>
  );
}
