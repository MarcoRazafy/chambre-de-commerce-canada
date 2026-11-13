"use client";

// Illustration du site (public/illustrations, SVG recolorés aux couleurs de la marque) : apparaît en fondu quand
// elle entre dans l'écran ; « flotte » : un lent va-et-vient vertical (coupé si l'appareil demande moins de mouvements)
import Image from "next/image";
import { useEffect, useRef } from "react";

export type NomIllustration =
  | "poignee-de-main" | "evenements" | "reseau" | "paiement" | "questions" | "chambre" | "membres"
  | "acces" | "adhesion" | "oubli" | "courriel" | "mot-de-passe" | "bienvenue" | "admin";

// Proportions de chaque dessin (largeur / hauteur de son viewBox), pour réserver la place avant le chargement
const PROPORTIONS: Record<NomIllustration, [number, number]> = {
  "poignee-de-main": [759, 615],
  evenements: [801, 614],
  reseau: [807, 699],
  paiement: [904, 586],
  questions: [861, 632],
  chambre: [1010, 771],
  membres: [809, 630],
  acces: [793, 552],
  adhesion: [512, 532],
  oubli: [951, 632],
  courriel: [570, 512],
  "mot-de-passe": [493, 481],
  bienvenue: [943, 796],
  admin: [543, 634],
};

export function Illustration({
  nom,
  className = "",
  flotte = false,
  priorite = false,
  contenir = false,
}: {
  nom: NomIllustration;
  className?: string;
  flotte?: boolean;
  /** Dans l'accroche : chargée et visible tout de suite */
  priorite?: boolean;
  /** Bornée à la moitié de la hauteur de l'écran (panneau d'une page d'authentification) */
  contenir?: boolean;
}) {
  const cadre = useRef<HTMLDivElement>(null);
  const [largeur, hauteur] = PROPORTIONS[nom];

  // Visible dès qu'elle entre dans l'écran (classe posée sur l'élément, sans nouveau rendu)
  useEffect(() => {
    const el = cadre.current;
    if (!el || priorite) return;
    if (!("IntersectionObserver" in window)) {
      el.classList.add("illustration-visible");
      return;
    }
    const obs = new IntersectionObserver(
      (entrees) => {
        if (entrees.some((e) => e.isIntersecting)) {
          el.classList.add("illustration-visible");
          obs.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [priorite]);

  return (
    <div ref={cadre} className={`illustration ${priorite ? "illustration-visible" : ""} ${flotte ? "illustration-flotte" : ""} ${className}`}>
      <Image
        src={`/illustrations/${nom}.svg`}
        alt=""
        aria-hidden
        width={largeur}
        height={hauteur}
        unoptimized
        priority={priorite}
        className={contenir ? "block mx-auto w-auto h-auto max-w-full max-h-[48vh]" : "w-full h-auto"}
      />
    </div>
  );
}
