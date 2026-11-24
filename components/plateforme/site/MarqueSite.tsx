import Link from "next/link";
import { LogoOfficiel } from "@/components/public/Marque";

export function Marque({ className = "w-2 h-6" }: { className?: string }) {
  return (
    <span aria-hidden className={`flex flex-col rounded-[3px] overflow-hidden shrink-0 ${className}`}>
      <span className="flex-1 bg-marque-rouge" />
      <span className="flex-1 bg-marque-vert" />
    </span>
  );
}

export const PIED_PLATEFORME = <>© {new Date().getFullYear()} L’Alliée Virtuelle</>;

export function MarqueSite({ clair = false }: { clair?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="L’Alliée Virtuelle, accueil"
      className={`inline-flex items-center gap-3 min-h-[44px] no-underline rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 ${
        clair ? "text-white focus-visible:outline-white" : "text-ink focus-visible:outline-marque-nuit"
      }`}
    >
      <LogoOfficiel version={clair ? "blanc" : "couleur"} priority={clair} className="text-[18px]" />
    </Link>
  );
}
