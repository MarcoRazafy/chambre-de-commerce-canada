import Link from "next/link";

// Le signe de la plateforme : deux encres, le rouge de l'équipe sur le vert des membres
export function Marque({ className = "w-2 h-6" }: { className?: string }) {
  return (
    <span aria-hidden className={`flex flex-col rounded-[3px] overflow-hidden shrink-0 ${className}`}>
      <span className="flex-1 bg-marque-rouge" />
      <span className="flex-1 bg-marque-vert" />
    </span>
  );
}

// Marque de la plateforme (signe et nom) : en-tête et pied du site, pages de connexion et d'inscription
export function MarqueSite({ clair = false }: { clair?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="L’Alliée Virtuelle, accueil"
      className={`inline-flex items-center gap-2.5 min-h-[44px] no-underline rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 ${
        clair ? "text-white focus-visible:outline-white" : "text-ink focus-visible:outline-marque-nuit"
      }`}
    >
      <Marque />
      <span className="text-[17px] font-semibold whitespace-nowrap">L’Alliée Virtuelle</span>
    </Link>
  );
}
