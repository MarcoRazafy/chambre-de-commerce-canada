"use client";

// Carte de l'offre à la carte (site) : son bouton ouvre une fenêtre pour choisir ses fonctions et voir le prix
import { useId, useRef } from "react";
import { X } from "lucide-react";
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
        className="mt-8 w-full inline-flex items-center justify-center min-h-[48px] px-5 rounded-[10px] border-0 bg-marque-nuit text-white text-[15px] font-medium cursor-pointer transition-colors hover:bg-[#1b2c3f] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marque-nuit"
      >
        Choisir {offre.nom}
      </button>

      <dialog
        ref={fenetre}
        aria-labelledby={`${id}-titre`}
        // Un clic hors de la fenêtre la ferme
        onClick={(e) => e.target === e.currentTarget && fermer()}
        className="fenetre-composeur m-auto p-0 border-0 bg-transparent w-[min(960px,calc(100vw-24px))] max-w-none max-h-[calc(100dvh-24px)] overflow-y-auto rounded-[20px] backdrop:bg-[rgba(15,29,44,0.6)] backdrop:backdrop-blur-sm"
      >
        <div className="rounded-[20px] bg-marque-nuit p-5 sm:p-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="m-0 text-[14px] text-white/60">{offre.nom}</p>
              <h2 id={`${id}-titre`} className="mt-2 mb-0 text-[clamp(24px,3vw,32px)] leading-[1.1] text-white">Composez votre offre</h2>
              <p className="mt-3 mb-0 max-w-[520px] text-[15px] leading-6 text-white/70">
                Cochez les fonctions dont votre Chambre a besoin, le prix se calcule en direct.
              </p>
            </div>
            <button
              type="button"
              onClick={fermer}
              aria-label="Fermer"
              className="grid place-items-center size-11 shrink-0 -mr-1 -mt-1 rounded-[10px] border-0 bg-white/10 text-white cursor-pointer transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <X size={20} strokeWidth={1.5} aria-hidden />
            </button>
          </div>
          <div className="mt-8">
            <ComposeurOffre mode="site" offre={offre} initiales={initiales} />
          </div>
        </div>
      </dialog>
    </>
  );
}
