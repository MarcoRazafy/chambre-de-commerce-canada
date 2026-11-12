import Link from "next/link";

// Cadre des pages du site de la plateforme (créer une Chambre, devenir membre, se connecter) :
// même fond que les pages de connexion, aux couleurs de la plateforme (pas d'une Chambre)
export function CadrePlateforme({ large = false, children }: { large?: boolean; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh relative overflow-hidden bg-[#fbfcfe]">
      <div aria-hidden className="grille-fine absolute inset-0" />
      <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgb(255 255 255 / 0.82) 0%, rgb(255 255 255 / 0.55) 100%)" }} />
      <div aria-hidden className="halo-marque absolute -top-32 -left-24 w-[460px] h-[460px] rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgb(173 7 7 / 0.18), transparent 70%)" }} />
      <div aria-hidden className="halo-marque absolute -bottom-32 -right-24 w-[520px] h-[520px] rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgb(0 113 64 / 0.18), transparent 70%)", animationDelay: "-7s" }} />

      <div className="relative min-h-dvh flex flex-col px-4 py-8 sm:px-6 lg:px-8">
        <header className={`w-full mx-auto flex items-center justify-between gap-4 mb-8 ${large ? "max-w-[860px]" : "max-w-[560px]"}`}>
          <Link href="/" className="no-underline text-ink font-bold text-[17px]">L’Alliée Virtuelle</Link>
          <Link href="/connexion" className="text-[13.5px] font-semibold text-muted no-underline hover:text-ink">Se connecter</Link>
        </header>
        <main className={`apparition flex-1 w-full mx-auto ${large ? "max-w-[860px]" : "max-w-[560px]"}`}>{children}</main>
        <p className="text-[12px] text-faint text-center m-0 mt-8">© {new Date().getFullYear()} L’Alliée Virtuelle</p>
      </div>
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
