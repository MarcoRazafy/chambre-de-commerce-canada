import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { Newspaper } from "lucide-react";
import { TITRE_GRAS } from "@/components/public/styles-titres";
import { fmtDate } from "@/lib/format";
import { dureeLecture } from "@/lib/texte";
import type { ActualitePublique } from "@/lib/queries";

export function CarteActualite({
  actualite: a,
  className = "",
  style,
}: {
  actualite: ActualitePublique;
  className?: string;
  style?: CSSProperties;
}) {
  const couverture = a.images[0];
  const minutes = dureeLecture(a.corps || a.extrait);
  return (
    <Link
      href={`/actualites/${a.id}`}
      className={`group flex flex-col no-underline rounded-xl overflow-hidden bg-white transition-shadow duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:shadow-[0_20px_60px_rgba(15,29,44,0.12)] ${className}`}
      style={style}
    >
      <div className="relative shrink-0 aspect-[16/9] overflow-hidden bg-[#e9edf2]">
        {couverture ? (
          <Image
            src={couverture}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 420px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0 flex items-center justify-center text-[#8797a6]"
          >
            <Newspaper size={34} />
          </div>
        )}
        <span className="absolute left-4 bottom-4 rounded-full bg-white/95 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--marque-nuit)] shadow-[0_2px_10px_rgba(15,29,44,0.18)]">
          {a.auteur ?? a.cat}
        </span>
      </div>

      <div className="flex flex-col flex-1 p-6">
        <span className="text-[12px] font-semibold uppercase tracking-[1px] text-[#6b6b6b]">
          {fmtDate(a.date)} · {minutes} min de lecture
        </span>
        <h3
          className={`${TITRE_GRAS} text-[22px] leading-[1.3] text-[var(--marque-nuit)] m-0 mt-3 mb-3.5`}
        >
          {a.titre}
        </h3>
        {a.libre ? null : (
          <p className="m-0 text-[14px] leading-[1.6] text-[#6b6b6b] line-clamp-3">
            {a.extrait}
          </p>
        )}
      </div>
    </Link>
  );
}
