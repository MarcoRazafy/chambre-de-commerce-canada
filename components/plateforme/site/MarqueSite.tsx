import Link from "next/link";

// Marque de la plateforme (texte) : en-tête et pied du site, pages de connexion et d'inscription
export function MarqueSite({ clair = false }: { clair?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="L’Alliée Virtuelle, accueil"
      className={`inline-flex items-center gap-2.5 min-h-[44px] no-underline rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 ${
        clair ? "text-white focus-visible:outline-white" : "text-ink focus-visible:outline-marque-nuit"
      }`}
    >
      <span aria-hidden className="block w-2 h-7 rounded-full" style={{ background: "linear-gradient(180deg, #ad0707, #007140)" }} />
      <span className="text-[18px] font-extrabold tracking-[-0.02em] whitespace-nowrap">L’Alliée Virtuelle</span>
    </Link>
  );
}
