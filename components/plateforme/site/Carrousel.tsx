"use client";

// Carrousel du site : une piste qui défile à l'horizontale, cran par cran (quatre éléments visibles sur grand écran,
// deux sur tablette, un et le bord du suivant sur téléphone), deux flèches rondes sur les bords qui avancent d'une
// page et s'effacent en bout de piste ; au doigt, la piste se fait glisser
import { useEffect, useRef, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

const FLECHE =
  "absolute top-[30%] -translate-y-1/2 z-[2] hidden sm:grid place-items-center size-12 rounded-full border border-line bg-white text-ink shadow-[0_10px_28px_-10px_rgba(28,26,23,0.35)] cursor-pointer transition-[background-color,opacity,visibility] duration-200 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marque-nuit";

export function Carrousel({ etiquette, elements }: { etiquette: string; elements: ReactNode[] }) {
  const piste = useRef<HTMLUListElement>(null);
  const gauche = useRef<HTMLButtonElement>(null);
  const droite = useRef<HTMLButtonElement>(null);

  // Les flèches s'effacent quand on est au début ou à la fin de la piste
  const maj = () => {
    const p = piste.current;
    if (!p) return;
    gauche.current?.classList.toggle("invisible", p.scrollLeft <= 2);
    droite.current?.classList.toggle("invisible", p.scrollLeft + p.clientWidth >= p.scrollWidth - 2);
  };

  useEffect(() => {
    maj();
    const p = piste.current;
    if (!p) return;
    const taille = new ResizeObserver(maj);
    taille.observe(p);
    return () => taille.disconnect();
  }, []);

  // D'une page (la largeur visible) vers l'avant ou l'arrière
  const defiler = (sens: 1 | -1) => {
    const p = piste.current;
    if (!p) return;
    const calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    p.scrollBy({ left: sens * p.clientWidth, behavior: calme ? "auto" : "smooth" });
  };

  return (
    <div className="relative">
      <ul
        ref={piste}
        data-reveal-groupe=""
        aria-label={etiquette}
        onScroll={maj}
        className="m-0 p-0 list-none flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-px-5 sm:scroll-px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-5 px-5 sm:mx-0 sm:px-0"
      >
        {elements.map((e, i) => (
          <li key={i} className="snap-start shrink-0 w-[78%] sm:w-[calc((100%-16px)/2)] lg:w-[calc((100%-48px)/4)]">
            {e}
          </li>
        ))}
      </ul>
      <button ref={gauche} type="button" aria-label="Précédent" onClick={() => defiler(-1)} className={`${FLECHE} left-0 -translate-x-1/2`}>
        <ArrowLeft size={20} strokeWidth={1.75} aria-hidden />
      </button>
      <button ref={droite} type="button" aria-label="Suivant" onClick={() => defiler(1)} className={`${FLECHE} right-0 translate-x-1/2`}>
        <ArrowRight size={20} strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  );
}
