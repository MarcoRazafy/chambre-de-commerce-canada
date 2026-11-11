import Image from "next/image";
import { Tag } from "lucide-react";
import { ModaleOffre } from "@/components/ModaleOffre";
import { TITRE_GRAS } from "@/components/public/CadreVitrine";
import { positionObjet } from "@/lib/cadrage";
import type { Offer } from "@/lib/types";

export function CarteOffre({ offre }: { offre: Offer }) {
  return (
    <ModaleOffre offre={offre}>
      <div className="group flex flex-col h-full rounded-xl overflow-hidden bg-white shadow-[0_2px_14px_rgba(15,29,44,0.06)] transition-shadow duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:shadow-[0_20px_60px_rgba(15,29,44,0.12)]">
        <div className="relative shrink-0 aspect-[16/9] overflow-hidden bg-[#e9edf2]">
          {offre.cover ? (
            <Image
              src={offre.cover}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 300px"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              style={
                offre.cadrage
                  ? { objectPosition: positionObjet(offre.cadrage) }
                  : undefined
              }
            />
          ) : (
            <div
              aria-hidden
              className="absolute inset-0 flex items-center justify-center text-[#8797a6]"
            >
              <Tag size={28} />
            </div>
          )}
          <span className="absolute left-4 bottom-4 max-w-[calc(100%-32px)] truncate rounded-full bg-white/95 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--marque-nuit)] shadow-[0_2px_10px_rgba(15,29,44,0.18)]">
            {offre.membre}
          </span>
        </div>

        <div className="flex flex-col flex-1 p-5">
          <h3
            className={`${TITRE_GRAS} text-[17px] leading-[1.35] text-[var(--marque-nuit)] m-0 mb-2 line-clamp-2 [overflow-wrap:anywhere]`}
          >
            {offre.titre}
          </h3>
          {offre.prix ? (
            <p className="m-0 mb-2 text-[15px] font-bold text-[var(--marque-rouge)] [overflow-wrap:anywhere]">{offre.prix}</p>
          ) : null}
          <p className="m-0 text-[13.5px] leading-[1.6] text-[#6b6b6b] line-clamp-3 [overflow-wrap:anywhere]">
            {offre.desc}
          </p>
        </div>
      </div>
    </ModaleOffre>
  );
}
