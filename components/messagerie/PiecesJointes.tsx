import { Download, FileText } from "lucide-react";
import { Agrandir } from "@/components/Agrandir";
import type { PieceJointe, Space } from "@/lib/types";
import { poids, urlPiece } from "./outils";

export function PiecesJointes({
  pieces,
  moi,
  space,
  url,
}: {
  pieces: PieceJointe[];
  moi: boolean;
  space: Space;
  // Adresse des fichiers, si elle n'est pas celle de la messagerie (Support IT)
  url?: (id: string, telecharger?: boolean) => string;
}) {
  if (!pieces.length) return null;
  const lien = url ?? ((id: string, telecharger = false) => urlPiece(id, space, telecharger));
  const images = pieces.filter((p) => p.type === "image");
  const autres = pieces.filter((p) => p.type !== "image");

  return (
    <div className="flex flex-col gap-1.5 mb-1">
      {images.length ? (
        <div
          className={`grid gap-1.5 ${images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
        >
          {images.map((p) => (
            <Agrandir
              key={p.id}
              src={lien(p.id)}
              alt={p.nom}
              legende={p.nom}
              className="rounded-[10px] overflow-hidden"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lien(p.id)}
                alt={p.nom}
                loading="lazy"
                className={`block w-full object-cover ${images.length > 1 ? "aspect-square" : "max-h-[260px]"}`}
              />
            </Agrandir>
          ))}
        </div>
      ) : null}

      {autres.map((p) =>
        p.type === "video" ? (
          <video
            key={p.id}
            src={lien(p.id)}
            controls
            preload="metadata"
            playsInline
            aria-label={p.nom}
            className="block w-full max-h-[260px] rounded-[10px] bg-black"
          />
        ) : (
          <div
            key={p.id}
            className={`flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 ${
              moi ? "bg-white/15" : "bg-surface border border-line"
            }`}
          >
            <span
              className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${
                moi ? "bg-white/20 text-white" : "bg-bad-soft text-bad"
              }`}
            >
              <FileText size={17} />
            </span>
            <a
              href={lien(p.id)}
              target="_blank"
              rel="noopener noreferrer"
              className={`min-w-0 flex-1 no-underline hover:underline ${moi ? "text-white" : "text-ink"}`}
            >
              <span className="block text-[12.6px] font-semibold truncate">
                {p.nom}
              </span>
              <span
                className={`block text-[10.8px] ${moi ? "text-white/70" : "text-faint"}`}
              >
                PDF · {poids(p.taille)}
              </span>
            </a>
            <a
              href={lien(p.id, true)}
              aria-label={`Enregistrer ${p.nom}`}
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                moi
                  ? "text-white/85 hover:bg-white/15"
                  : "text-muted hover:bg-surface-2"
              }`}
            >
              <Download size={15} />
            </a>
          </div>
        ),
      )}
    </div>
  );
}
