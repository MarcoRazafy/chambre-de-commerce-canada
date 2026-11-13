"use client";

// Révélation au défilement (site de la plateforme) : les blocs marqués data-reveal (un bloc) ou data-reveal-groupe
// (ses enfants, l'un après l'autre) apparaissent quand ils entrent dans l'écran. Sans script, tout est visible ;
// ce qui est déjà à l'écran au chargement reste tel quel ; si l'appareil demande moins de mouvements, rien ne bouge.
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const PAS = 70; // ms entre deux enfants d'un groupe
const MAX = 7; // au-delà, les enfants partent ensemble

export function Revelateur() {
  const chemin = usePathname();

  useEffect(() => {
    const html = document.documentElement;
    const premierChargement = !html.classList.contains("js-pret");
    html.classList.add("js-pret");

    const cibles = Array.from(document.querySelectorAll<HTMLElement>(".site-plateforme [data-reveal], .site-plateforme [data-reveal-groupe]"));
    const montrer = (el: HTMLElement, anime: boolean) => {
      if (el.hasAttribute("data-reveal-groupe")) {
        Array.from(el.children).forEach((c, i) => (c as HTMLElement).style.setProperty("--delai", `${Math.min(i, MAX) * PAS}ms`));
      }
      el.classList.add("est-visible");
      if (!anime) el.classList.add("sans-mouvement");
    };

    const calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (calme || !("IntersectionObserver" in window)) {
      cibles.forEach((el) => montrer(el, false));
      return;
    }

    const obs = new IntersectionObserver(
      (entrees) => {
        for (const e of entrees) {
          if (!e.isIntersecting) continue;
          montrer(e.target as HTMLElement, true);
          obs.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );

    const h = window.innerHeight;
    for (const el of cibles) {
      if (el.classList.contains("est-visible")) continue;
      const r = el.getBoundingClientRect();
      // Déjà à l'écran : tel quel au premier chargement (rien ne clignote), en mouvement après une navigation
      if (r.top < h && r.bottom > 0) montrer(el, !premierChargement);
      else obs.observe(el);
    }
    return () => obs.disconnect();
  }, [chemin]);

  return null;
}
