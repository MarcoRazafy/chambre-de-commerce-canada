"use client";

import { useState } from "react";
import { Plus, Tag } from "lucide-react";
import { INPUT } from "@/components/form-bits";
import { plat } from "@/lib/texte";

const LIMITE = 5;

// Tags à cocher, avec la création d'un nouveau tag (« Ajouter des tags »)
export function ChoixTags({
  options,
  creation,
  initiaux = [],
  name = "tags",
}: {
  options: string[];
  creation: boolean;
  initiaux?: string[];
  name?: string;
}) {
  const [choisis, setChoisis] = useState<string[]>(initiaux);
  const [saisie, setSaisie] = useState("");
  const [tout, setTout] = useState(false);
  const proposes = [...new Set([...options, ...choisis])].filter((t) => !saisie || plat(t).includes(plat(saisie)));
  const nouveau = creation && saisie.trim() && ![...options, ...choisis].some((t) => plat(t) === plat(saisie.trim()));
  // Au-delà de LIMITE, seuls les premiers (et ceux déjà choisis) s'affichent, sauf pendant une recherche
  const replie = !tout && !saisie && proposes.length > LIMITE;
  const visibles = replie ? proposes.filter((t, i) => i < LIMITE || choisis.includes(t)) : proposes;
  const basculer = (t: string) => setChoisis((c) => (c.includes(t) ? c.filter((x) => x !== t) : [...c, t]));

  return (
    <div className="flex flex-col gap-2.5">
      {choisis.map((t) => (
        <input key={t} type="hidden" name={name} value={t} />
      ))}
      {options.length > 6 || creation ? (
        <input
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const t = saisie.trim().replace(/\s+/g, " ");
              if (t && creation) {
                const existant = options.find((o) => plat(o) === plat(t)) ?? t;
                if (!choisis.includes(existant)) basculer(existant);
                setSaisie("");
              }
            }
          }}
          maxLength={60}
          placeholder={creation ? "Chercher ou créer un tag…" : "Chercher un tag…"}
          aria-label="Chercher un tag"
          className={INPUT}
        />
      ) : null}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tags">
        {visibles.map((t) => {
          const actif = choisis.includes(t);
          return (
            <button
              key={t}
              type="button"
              aria-pressed={actif}
              onClick={() => basculer(t)}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12.5px] font-semibold cursor-pointer transition-colors duration-150 ${
                actif ? "bg-accent border-accent text-white" : "bg-surface border-line text-ink hover:border-accent hover:text-accent"
              }`}
            >
              <Tag size={12} aria-hidden /> {t}
            </button>
          );
        })}
        {nouveau ? (
          <button
            type="button"
            onClick={() => {
              basculer(saisie.trim().replace(/\s+/g, " "));
              setSaisie("");
            }}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-accent bg-surface px-2.5 py-1 text-[12.5px] font-semibold text-accent cursor-pointer hover:bg-accent-soft"
          >
            <Plus size={12} aria-hidden /> Créer « {saisie.trim()} »
          </button>
        ) : null}
        {!saisie && proposes.length > LIMITE ? (
          <button
            type="button"
            onClick={() => setTout((v) => !v)}
            aria-expanded={tout}
            className="inline-flex items-center rounded-full border-0 bg-transparent px-2 py-1 text-[12.5px] font-semibold text-accent cursor-pointer hover:underline"
          >
            {tout ? "Voir moins" : `Voir tout (${proposes.length})`}
          </button>
        ) : null}
        {!proposes.length && !nouveau ? <span className="text-[12.5px] text-muted">Aucun tag.</span> : null}
      </div>
      <p className="m-0 text-[12px] text-muted">{choisis.length ? `${choisis.length} tag${choisis.length > 1 ? "s" : ""} choisi${choisis.length > 1 ? "s" : ""}` : "Cliquez sur les tags à choisir."}</p>
    </div>
  );
}
