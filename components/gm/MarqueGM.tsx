import Link from "next/link";
import { LogoOfficiel } from "@/components/public/Marque";

export function MarqueGM() {
  return (
    <Link href="/gm" aria-label="Espace administrateur, accueil" className="inline-block">
      <LogoOfficiel className="text-[19px]" priority />
    </Link>
  );
}

export const PIED_GM = <>© {new Date().getFullYear()} L’Alliée Virtuelle</>;
