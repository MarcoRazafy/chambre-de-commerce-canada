import Link from "next/link";
import { MarqueSite } from "@/components/plateforme/site/MarqueSite";
import { FONCTIONS } from "@/lib/fonctions-plateforme";

const LIEN = "inline-flex items-center min-h-[44px] md:min-h-[32px] text-[14px] text-muted no-underline hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marque-nuit rounded-sm";
const TITRE = "sans m-0 text-[13px] font-medium text-ink";
const LISTE = "mt-2 m-0 p-0 list-none grid";

// Pied du site de la plateforme
export function PiedSite() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <div>
          <MarqueSite />
          <p className="mt-3 mb-0 max-w-[320px] text-[14px] leading-[22px] text-muted">
            L’espace de gestion des Chambres de commerce et des associations d’affaires, avec un espace pour leurs membres.
          </p>
        </div>
        <nav aria-label="Plateforme">
          <h2 className={TITRE}>Plateforme</h2>
          <ul className={LISTE}>
            <li><Link href="/#fonctionnement" className={LIEN}>Fonctionnement</Link></li>
            <li><Link href="/tarifs" className={LIEN}>Tarifs</Link></li>
            <li><Link href="/tarifs#sur-mesure" className={LIEN}>Offre à la carte</Link></li>
            <li><Link href="/tarifs#comparer" className={LIEN}>Comparer les offres</Link></li>
            <li><Link href="/#questions" className={LIEN}>Questions</Link></li>
          </ul>
        </nav>
        <nav aria-label="Fonctions">
          <h2 className={TITRE}>Fonctions</h2>
          <ul className={LISTE}>
            <li><Link href="/#fonctions" className={LIEN}>Membres et cotisations</Link></li>
            {FONCTIONS.map((f) => (
              <li key={f.cle}><Link href="/#fonctions" className={LIEN}>{f.libelle}</Link></li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Accès">
          <h2 className={TITRE}>Accès</h2>
          <ul className={LISTE}>
            <li><Link href="/creer-une-chambre" className={LIEN}>Créer une Chambre</Link></li>
            <li><Link href="/devenir-membre" className={LIEN}>Devenir membre</Link></li>
            <li><Link href="/connexion" className={LIEN}>Se connecter</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-[13px] text-faint">
          <span className="inline-flex items-center min-h-[44px] md:min-h-[32px]">© {new Date().getFullYear()} L’Alliée Virtuelle</span>
          <nav aria-label="Informations légales" className="flex flex-wrap gap-x-5">
            <Link href="/mentions-legales" className={LIEN}>Mentions légales</Link>
            <Link href="/confidentialite" className={LIEN}>Confidentialité</Link>
            <Link href="/conditions" className={LIEN}>Conditions d’utilisation</Link>
            <Link href="/contact" className={LIEN}>Contact</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
