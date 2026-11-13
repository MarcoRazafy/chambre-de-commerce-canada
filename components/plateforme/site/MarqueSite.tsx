import Image from "next/image";
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

// Marque du site : le logo IMPACT 261 (blanc sur fond sombre) et le nom de la plateforme ; en-tête et pied du site
export function MarqueSite({ clair = false }: { clair?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="L’Alliée Virtuelle, accueil"
      className={`inline-flex items-center gap-3 min-h-[44px] no-underline rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 ${
        clair ? "text-white focus-visible:outline-white" : "text-ink focus-visible:outline-marque-nuit"
      }`}
    >
      <Image
        src={clair ? "/marque/logo-blanc.png" : "/marque/logo-couleur.png"}
        alt="IMPACT 261"
        width={1600}
        height={647}
        priority={clair}
        className="h-11 w-auto"
        sizes="140px"
      />
      <span aria-hidden className={`hidden sm:block w-px h-6 ${clair ? "bg-white/25" : "bg-line-champ"}`} />
      <span className="hidden sm:inline text-[16px] font-semibold whitespace-nowrap">L’Alliée Virtuelle</span>
    </Link>
  );
}
