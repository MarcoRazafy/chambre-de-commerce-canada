"use client";

// Pièces jointes d'un message (Support IT) : photos, vidéos (MP4, WebM, MOV), PDF ; 5 au plus
import { useRef } from "react";
import { FileText, Film, Image as ImageIcon, Paperclip, X } from "lucide-react";
import { PLAFOND_FICHIER, PLAFOND_FICHIER_MO } from "@/lib/plafonds";
import { poids } from "@/components/messagerie/outils";

export const PIECES_MAX = 5;
const ACCEPTE = "image/*,video/mp4,video/webm,video/quicktime,application/pdf";
const VIDEOS = ["video/mp4", "video/webm", "video/quicktime"];
const accepte = (f: File) => f.type.startsWith("image/") || VIDEOS.includes(f.type) || f.type === "application/pdf";

// Ajoute des fichiers à ceux déjà choisis ; l'erreur dit ce qui a été écarté
export function ajouterPieces(actuels: File[], nouveaux: File[]): { fichiers: File[]; erreur: string | null } {
  const fichiers = [...actuels];
  let erreur: string | null = null;
  for (const f of nouveaux) {
    if (!accepte(f)) erreur = `« ${f.name} » : seules les photos, les vidéos (MP4, WebM, MOV) et les PDF sont acceptés.`;
    else if (f.size > PLAFOND_FICHIER) erreur = `« ${f.name} » dépasse ${PLAFOND_FICHIER_MO} Mo.`;
    else if (fichiers.length >= PIECES_MAX) erreur = `${PIECES_MAX} pièces jointes au plus par message.`;
    else fichiers.push(f);
  }
  return { fichiers, erreur };
}

export function BoutonJoindre({
  choisir,
  desactive,
  className = "",
}: {
  choisir: (fichiers: File[]) => void;
  desactive?: boolean;
  className?: string;
}) {
  const champ = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={champ}
        type="file"
        multiple
        accept={ACCEPTE}
        className="hidden"
        tabIndex={-1}
        onChange={(e) => {
          choisir(Array.from(e.currentTarget.files ?? []));
          e.currentTarget.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => champ.current?.click()}
        disabled={desactive}
        aria-label="Joindre une photo, une vidéo ou un PDF"
        title="Joindre une photo, une vidéo ou un PDF"
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border border-line bg-surface text-muted cursor-pointer hover:text-ink hover:bg-surface-2 disabled:opacity-40 disabled:cursor-default focus-visible:outline-2 focus-visible:outline-navy ${className}`}
      >
        <Paperclip size={17} aria-hidden />
      </button>
    </>
  );
}

export function PiecesChoisies({ fichiers, retirer }: { fichiers: File[]; retirer: (index: number) => void }) {
  if (!fichiers.length) return null;
  return (
    <ul className="m-0 mb-2 p-0 list-none flex flex-wrap gap-1.5">
      {fichiers.map((f, i) => {
        const Icone = f.type.startsWith("image/") ? ImageIcon : f.type.startsWith("video/") ? Film : FileText;
        return (
          <li
            key={`${f.name}-${f.size}-${i}`}
            className="flex items-center gap-1.5 max-w-full rounded-full border border-line bg-surface-2 pl-2.5 pr-1 py-1 text-[12px] text-ink"
          >
            <Icone size={14} className="text-muted shrink-0" aria-hidden />
            <span className="truncate max-w-[150px]">{f.name}</span>
            <span className="text-faint shrink-0 tabular-nums">{poids(f.size)}</span>
            <button
              type="button"
              onClick={() => retirer(i)}
              aria-label={`Retirer ${f.name}`}
              className="w-6 h-6 rounded-full flex items-center justify-center bg-transparent border-0 text-muted cursor-pointer hover:bg-surface hover:text-ink"
            >
              <X size={13} aria-hidden />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
