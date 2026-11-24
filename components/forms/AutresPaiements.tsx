"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { INPUT } from "@/components/champ-style";
import { SUPPLEMENTS_MAX } from "@/lib/supplements";

type Ligne = { cle: number; libelle: string; prix: string };
let suivante = 0;
const ligne = (libelle = "", prix = ""): Ligne => ({ cle: suivante++, libelle, prix });

export function AutresPaiements({ initiaux }: { initiaux: { libelle: string; prix: number }[] }) {
  const [lignes, setLignes] = useState<Ligne[]>(() => initiaux.map((s) => ligne(s.libelle, String(s.prix))));

  return (
    <div className="flex flex-col gap-2.5">
      <div className="text-[12.5px] font-semibold text-muted">Autres paiements</div>
      {lignes.map((l, i) => (
        <div key={l.cle} className="flex flex-col gap-2 rounded-[var(--radius-s)] border border-line bg-surface-2 p-2.5">
          <input
            name="supplementLibelle"
            defaultValue={l.libelle}
            maxLength={80}
            required
            placeholder="Ex. Dîner de gala"
            aria-label={`Autre paiement ${i + 1} : nom`}
            className={INPUT}
          />
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <input
                type="number"
                name="supplementPrix"
                defaultValue={l.prix}
                min={1}
                required
                placeholder="Prix"
                aria-label={`Autre paiement ${i + 1} : prix ($ CAD)`}
                className={`${INPUT} pr-16`}
              />
              <span aria-hidden className="absolute right-3 top-1/2 -translate-y-1/2 text-[12.5px] text-faint pointer-events-none">$ CAD</span>
            </div>
            <button
              type="button"
              onClick={() => setLignes((x) => x.filter((y) => y.cle !== l.cle))}
              aria-label={`Retirer l’autre paiement ${i + 1}`}
              title="Retirer"
              className="w-9 h-9 shrink-0 rounded-[var(--radius-s)] border border-line bg-surface flex items-center justify-center cursor-pointer text-muted hover:text-accent hover:border-accent"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
      {lignes.length < SUPPLEMENTS_MAX ? (
        <button
          type="button"
          onClick={() => setLignes((x) => [...x, ligne()])}
          className="self-start btn-contour btn-contour-sm text-ink hover:bg-surface-2"
        >
          <Plus size={14} /> Ajouter un paiement
        </button>
      ) : null}
    </div>
  );
}
