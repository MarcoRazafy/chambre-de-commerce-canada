import type { CSSProperties } from "react";
import Image from "next/image";
import { TITRE_GRAS } from "@/components/public/styles-titres";
import Link from "next/link";
import { ArrowRight, Clock, MapPin } from "lucide-react";
import { plageHoraire } from "@/lib/agenda";
import { parseISO } from "@/lib/format";
import { visuelEvenement } from "@/lib/images-publiques";
import type { CanchamEvent } from "@/lib/types";

function categorie(e: CanchamEvent): string {
  const t = e.titre.toLowerCase();
  if (t.includes("5 à 7")) return "Réseautage";
  if (t.includes("mecc") || t.includes("mission")) return "Mission économique";
  if (t.includes("expo") || t.includes("caravane")) return "Rencontre";
  if (e.format === "Webinaire") return "Atelier en ligne";
  return "Événement";
}

export function CarteEvenement({
  evenement,
  index,
  className = "",
  style,
}: {
  evenement: CanchamEvent;
  index: number;
  className?: string;
  style?: CSSProperties;
}) {
  const d = parseISO(evenement.date);
  const jour = d.getDate();
  const mois = d
    .toLocaleDateString("fr-FR", { month: "short" })
    .replace(".", "")
    .toUpperCase();
  const horaire = plageHoraire(evenement.debut, evenement.fin);
  const visuel = evenement.photo
    ? { url: evenement.photo, alt: "" }
    : visuelEvenement(evenement.id, index);

  return (
    <Link
      href={`/evenements/${evenement.id}`}
      className={`group snap-start shrink-0 w-[84%] sm:w-[320px] md:w-[calc((100%-20px)/2)] lg:w-[calc((100%-40px)/3)] flex flex-col no-underline rounded-xl overflow-hidden bg-surface border border-line shadow-[var(--shadow)] transition-[border-color,box-shadow] hover:border-faint hover:shadow-[0_18px_40px_-22px_rgb(15_29_44/0.45)] ${className}`}
      style={style}
    >
      <div className="relative shrink-0 aspect-[16/10] overflow-hidden bg-surface-3">
        {visuel ? (
          <Image
            src={visuel.url}
            alt={visuel.alt}
            fill
            sizes="(max-width: 768px) 100vw, 360px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : null}
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className="font-[family-name:var(--font-titre)] text-[11.5px] font-bold px-2.5 py-1 rounded-md bg-marque-rouge text-white tracking-wide">
            {jour} {mois}
          </span>
          <span className="surtitre text-faint">{categorie(evenement)}</span>
        </div>

        <h3 className={`${TITRE_GRAS} text-[19px] m-0 mb-2.5 text-ink`}>
          {evenement.titre}
        </h3>

        <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-[13px] text-muted mb-4">
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={14} />
            {evenement.lieu}
          </span>
          {horaire ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock size={14} />
              {horaire}
            </span>
          ) : null}
        </div>

        <span className="mt-auto inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-marque-vert">
          Découvrir
          <ArrowRight
            size={15}
            className="transition-transform group-hover:translate-x-1"
          />
        </span>
      </div>
    </Link>
  );
}
