import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, UserPlus } from "lucide-react";
import { CadrePlateforme } from "@/components/plateforme/CadrePlateforme";

export const metadata: Metadata = { title: { absolute: "L’Alliée Virtuelle" } };

const CHOIX = [
  { href: "/creer-une-chambre", titre: "Créer une Chambre", detail: "Votre espace pour gérer vos membres, événements et cotisations.", icone: Building2, ton: "text-marque-rouge" },
  { href: "/devenir-membre", titre: "Devenir membre", detail: "Rejoindre une Chambre déjà sur la plateforme.", icone: UserPlus, ton: "text-marque-vert" },
];

// Site public de la plateforme : créer un compte, d'une des deux façons
export default function AccueilPlateforme() {
  return (
    <CadrePlateforme large>
      <h1 className="titre text-[clamp(28px,4vw,40px)] m-0 mb-8">Créer un compte</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {CHOIX.map(({ href, titre, detail, icone: Icone, ton }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col gap-3 rounded-[var(--radius-l)] border-2 border-line bg-surface p-6 no-underline text-ink transition-colors hover:border-faint shadow-[0_18px_44px_-30px_rgb(15_29_44/0.35)]"
          >
            <Icone size={26} className={ton} aria-hidden />
            <span className="text-[19px] font-bold">{titre}</span>
            <span className="text-[14px] text-muted">{detail}</span>
            <span className={`mt-auto inline-flex items-center gap-1.5 text-[13.5px] font-semibold ${ton}`}>
              Continuer <ArrowRight size={15} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </CadrePlateforme>
  );
}
