"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Search, Tag, X } from "lucide-react";
import { plat } from "@/lib/texte";

// Tags choisis en pastilles, et un bouton qui ouvre la liste des autres tags (recherche comprise)
export function SelecteurTags({
  name,
  options,
  initiaux,
  bouton,
  ton = "rouge",
}: {
  name: string;
  options: string[];
  initiaux: string[];
  bouton: string;
  ton?: "rouge" | "gris";
}) {
  const [choisis, setChoisis] = useState(initiaux.filter((t) => options.includes(t)));
  const [ouvert, setOuvert] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const visibles = options.filter((t) => !q || plat(t).includes(plat(q)));
  const basculer = (t: string) => setChoisis((c) => (c.includes(t) ? c.filter((x) => x !== t) : [...c, t]));

  useEffect(() => {
    if (!ouvert) return;
    const fermer = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOuvert(false);
    };
    document.addEventListener("pointerdown", fermer);
    document.addEventListener("keydown", fermer);
    return () => {
      document.removeEventListener("pointerdown", fermer);
      document.removeEventListener("keydown", fermer);
    };
  }, [ouvert]);

  const pastille = ton === "rouge" ? "bg-accent-soft text-accent-strong" : "bg-surface-3 text-ink line-through decoration-1";
  return (
    <div ref={ref} className="relative">
      {choisis.map((t) => <input key={t} type="hidden" name={name} value={t} />)}
      <div className="flex flex-wrap items-center gap-1.5">
        {choisis.map((t) => (
          <span key={t} className={`inline-flex items-center gap-1 rounded-full pl-2.5 pr-1 py-0.5 text-[12.5px] font-semibold ${pastille}`}>
            <Tag size={11} aria-hidden /> <span className={ton === "gris" ? "line-through" : ""}>{t}</span>
            <button type="button" onClick={() => setChoisis((c) => c.filter((x) => x !== t))} aria-label={`Retirer ${t}`}
              className="w-5 h-5 grid place-items-center rounded-full border-0 bg-transparent text-inherit cursor-pointer hover:bg-black/10 no-underline"><X size={12} /></button>
          </span>
        ))}
        <button type="button" onClick={() => setOuvert((o) => !o)} disabled={!options.length} aria-expanded={ouvert}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-line bg-transparent px-2.5 py-1 text-[12.5px] font-semibold text-muted cursor-pointer hover:border-accent hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed">
          <Plus size={13} /> {choisis.length ? "Modifier" : bouton}
        </button>
      </div>
      {ouvert ? (
        <div className="absolute z-30 left-0 mt-1.5 w-full min-w-[220px] rounded-[var(--radius-m)] border border-line bg-surface shadow-[var(--shadow)] p-1.5">
          {options.length > 6 ? (
            <div className="relative mb-1">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" aria-hidden />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un tag…" aria-label="Chercher un tag"
                className="w-full rounded-[var(--radius-s)] border border-line bg-surface text-ink pl-8 pr-2 py-1.5 text-[13px] outline-none focus:border-accent" />
            </div>
          ) : null}
          <div className="max-h-[240px] overflow-y-auto" role="group" aria-label="Tags">
            {visibles.map((t) => (
              <label key={t} className="flex items-center gap-2.5 rounded-[var(--radius-s)] px-2.5 py-2 text-[13px] text-ink cursor-pointer hover:bg-surface-2">
                <input type="checkbox" checked={choisis.includes(t)} onChange={() => basculer(t)} className="w-4 h-4 accent-[var(--accent)] cursor-pointer" />
                <span className="truncate">{t}</span>
              </label>
            ))}
            {!visibles.length ? <p className="m-0 px-2.5 py-2 text-[12.5px] text-muted">Aucun tag trouvé.</p> : null}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-line mt-1 pt-1.5 px-1">
            <button type="button" onClick={() => setChoisis(choisis.length === options.length ? [] : [...options])}
              className="border-0 bg-transparent text-[12.5px] font-semibold text-muted cursor-pointer hover:text-accent">
              {choisis.length === options.length ? "Tout décocher" : "Tout cocher"}
            </button>
            <button type="button" onClick={() => setOuvert(false)} className="btn-action btn-action-sm">OK · {choisis.length}</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
