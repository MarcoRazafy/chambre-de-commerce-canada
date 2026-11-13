import Link from "next/link";
import { LogoOfficiel } from "@/components/public/Marque";

// Marque sur les pages de connexion de l'espace GM : le logo IMPACT 261, qui mène à l'accueil de l'espace
export function MarqueGM() {
  return (
    <Link href="/gm" aria-label="Espace administrateur, accueil" className="inline-block">
      <LogoOfficiel className="w-[170px] h-auto" priority />
    </Link>
  );
}

export const PIED_GM = <>© {new Date().getFullYear()} L’Alliée Virtuelle</>;
