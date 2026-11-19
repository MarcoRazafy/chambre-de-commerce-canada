import Image from "next/image";
import type { Coordonnees } from "@/lib/modes-reglement";
import type { Devise } from "@/lib/membership";

export interface PropsReglement {
  reglementId: string;
  reference: string;
  montant: number;
  devise: Devise;
  objet: string;
  numeroFacture: string | null;
  statut: string;
  retour: string;
  etape: string | undefined;
  coordonnees: Coordonnees;
  payeur: string;
  personne: string;
  detail: Record<string, unknown>;
  aujourdhui: string;
  logo: string;
}

export function chiffre(montant: number): string {
  return montant.toLocaleString("fr-FR");
}

export function sigle(devise: Devise): string {
  return devise === "CAD" ? "$" : "Ar";
}

export function conclu(statut: string): boolean {
  return statut === "annonce" || statut === "reussie";
}

export function PastilleChambre({ logo, className = "" }: { logo: string; className?: string }) {
  return (
    <span
      className={`flex h-12 shrink-0 items-center rounded-[10px] bg-white px-3 ${className}`}
    >
      <Image
        src={logo}
        alt=""
        width={400}
        height={160}
        className="h-9 w-auto max-w-[140px] object-contain"
      />
    </span>
  );
}
