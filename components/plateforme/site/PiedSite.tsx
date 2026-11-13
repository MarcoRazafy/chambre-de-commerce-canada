import Link from "next/link";
import { MarqueSite } from "@/components/plateforme/site/MarqueSite";
import { FONCTIONS } from "@/lib/fonctions-plateforme";

const LIEN = "text-[14.5px] text-muted no-underline hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marque-nuit rounded-sm";

// Pied du site de la plateforme
export function PiedSite() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <div>
          <MarqueSite />
          <p className="mt-4 mb-0 max-w-[340px] text-[14.5px] leading-relaxed text-muted">
            L’espace de gestion des Chambres de commerce et des associations d’affaires, avec un espace pour leurs membres.
          </p>
        </div>
        <nav aria-label="Plateforme">
          <h2 className="m-0 text-[13px] font-bold uppercase tracking-[0.1em] text-ink">Plateforme</h2>
          <ul className="mt-4 m-0 p-0 list-none grid gap-2.5">
            <li><Link href="/#fonctionnement" className={LIEN}>Fonctionnement</Link></li>
            <li><Link href="/tarifs" className={LIEN}>Tarifs</Link></li>
            <li><Link href="/tarifs#sur-mesure" className={LIEN}>Offre à la carte</Link></li>
            <li><Link href="/tarifs#comparer" className={LIEN}>Comparer les offres</Link></li>
            <li><Link href="/#questions" className={LIEN}>Questions</Link></li>
          </ul>
        </nav>
        <nav aria-label="Fonctions">
          <h2 className="m-0 text-[13px] font-bold uppercase tracking-[0.1em] text-ink">Fonctions</h2>
          <ul className="mt-4 m-0 p-0 list-none grid gap-2.5">
            <li><Link href="/#fonctions" className={LIEN}>Membres et cotisations</Link></li>
            {FONCTIONS.map((f) => (
              <li key={f.cle}><Link href="/#fonctions" className={LIEN}>{f.libelle}</Link></li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Accès">
          <h2 className="m-0 text-[13px] font-bold uppercase tracking-[0.1em] text-ink">Accès</h2>
          <ul className="mt-4 m-0 p-0 list-none grid gap-2.5">
            <li><Link href="/creer-une-chambre" className={LIEN}>Créer une Chambre</Link></li>
            <li><Link href="/devenir-membre" className={LIEN}>Devenir membre</Link></li>
            <li><Link href="/connexion" className={LIEN}>Se connecter</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <p className="max-w-[1200px] mx-auto px-5 sm:px-8 py-6 m-0 text-[13px] text-faint">© {new Date().getFullYear()} L’Alliée Virtuelle</p>
      </div>
    </footer>
  );
}
