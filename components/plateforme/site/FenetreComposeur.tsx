"use client";

// Carte de l'offre à la carte (site) : son bouton ouvre une fenêtre pour choisir ses fonctions et voir le prix
import { useId, useRef } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { ComposeurOffre, type OffreComposable } from "@/components/plateforme/ComposeurOffre";

export function BoutonComposer({ offre, initiales }: { offre: OffreComposable; initiales: string[] }) {
  const id = useId();
  const fenetre = useRef<HTMLDialogElement>(null);
  const fermer = () => fenetre.current?.close();

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => fenetre.current?.showModal()}
        className="mt-8 w-full inline-flex items-center justify-center gap-2.5 min-h-[50px] px-6 rounded-[5px] border border-marque-nuit bg-marque-nuit text-white text-[13px] font-bold uppercase tracking-[0.09em] cursor-pointer transition-colors hover:bg-[#1b2c3f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marque-nuit"
      >
        <SlidersHorizontal size={16} aria-hidden /> Choisir {offre.nom}
      </button>

      <dialog
        ref={fenetre}
        aria-labelledby={`${id}-titre`}
        // Un clic hors de la fenêtre la ferme
        onClick={(e) => e.target === e.currentTarget && fermer()}
        className="fenetre-composeur m-auto p-0 border-0 bg-transparent w-[min(980px,calc(100vw-24px))] max-w-none max-h-[calc(100dvh-24px)] overflow-y-auto rounded-3xl backdrop:bg-[rgba(15,29,44,0.62)] backdrop:backdrop-blur-sm"
      >
        <div className="anim-fondu relative overflow-hidden rounded-3xl bg-marque-nuit p-5 sm:p-10">
          <div aria-hidden className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full blur-3xl opacity-40" style={{ background: "radial-gradient(circle, rgb(0 113 64 / 0.75), transparent 70%)" }} />
          <div aria-hidden className="absolute -bottom-40 -left-24 w-[420px] h-[420px] rounded-full blur-3xl opacity-30" style={{ background: "radial-gradient(circle, rgb(173 7 7 / 0.8), transparent 70%)" }} />
          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[12px] font-bold uppercase tracking-[0.08em] text-white">
                  <SlidersHorizontal size={13} aria-hidden /> {offre.nom}
                </span>
                <h2 id={`${id}-titre`} className="mt-4 mb-0 text-[clamp(22px,3vw,30px)] font-extrabold text-white">Composez votre offre</h2>
                <p className="mt-2 mb-0 max-w-[560px] text-[15px] leading-relaxed text-white/70">
                  Cochez les fonctions dont votre Chambre a besoin : le prix se calcule en direct.
                </p>
              </div>
              <button
                type="button"
                onClick={fermer}
                aria-label="Fermer"
                className="grid place-items-center size-11 shrink-0 -mr-1 -mt-1 rounded-full border-0 bg-white/10 text-white cursor-pointer transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <X size={20} aria-hidden />
              </button>
            </div>
            <div className="mt-8">
              <ComposeurOffre mode="site" offre={offre} initiales={initiales} />
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
