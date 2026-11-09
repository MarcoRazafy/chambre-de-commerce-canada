"use client";

import { useEffect, useRef } from "react";
import { Check, ChevronDown } from "lucide-react";

export type GroupeCoches = { famille?: string; options: { valeur: string; libelle: string }[] };

// Menu déroulant à cases à cocher, à placer dans un <FiltresAuto> : chaque case cochée part
// sous le même nom (« situation=a_jour&situation=en_retard »), et le filtre s'applique aussitôt.
export function FiltreCoches({
  name,
  libelle,
  tous,
  groupes,
  choisis,
}: {
  name: string;
  libelle: string;
  tous: string;
  groupes: GroupeCoches[];
  choisis: string[];
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const options = groupes.flatMap((g) => g.options);
  const retenus = options.filter((o) => choisis.includes(o.valeur));
  const resume =
    retenus.length === 0 ? tous : retenus.length === 1 ? retenus[0].libelle : `${libelle} · ${retenus.length}`;

  // Se ferme au clic à côté ou avec Échap
  useEffect(() => {
    const fermer = (e: Event) => {
      const d = ref.current;
      if (!d?.open) return;
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !d.contains(e.target as Node)) {
        d.open = false;
        if (e instanceof KeyboardEvent) d.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", fermer);
    document.addEventListener("keydown", fermer);
    return () => {
      document.removeEventListener("pointerdown", fermer);
      document.removeEventListener("keydown", fermer);
    };
  }, []);

  const effacer = () => {
    const d = ref.current;
    if (!d) return;
    d.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`).forEach((c) => (c.checked = false));
    d.closest("form")?.requestSubmit();
  };

  return (
    <details ref={ref} className="relative group/coches">
      <summary
        aria-label={`${libelle} : ${resume}`}
        className={`list-none [&::-webkit-details-marker]:hidden flex items-center gap-2 cursor-pointer select-none rounded-[var(--radius-s)] border bg-surface px-3 py-2.5 text-[13.5px] min-w-[190px] transition-colors duration-150 outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 ${
          retenus.length ? "border-accent text-accent-strong font-semibold" : "border-line text-ink"
        }`}
      >
        <span className="flex-1 truncate">{resume}</span>
        <ChevronDown size={15} className="shrink-0 transition-transform duration-150 group-open/coches:rotate-180" aria-hidden />
      </summary>

      <div className="absolute z-30 left-0 mt-1.5 w-[min(300px,calc(100vw-32px))] max-h-[min(420px,70vh)] overflow-y-auto rounded-[var(--radius-m)] border border-line bg-surface shadow-[var(--shadow-lg,var(--shadow))] p-1.5">
        {groupes.map((g, i) => (
          <fieldset key={g.famille ?? i} className={`m-0 p-0 border-0 ${i ? "mt-1.5 pt-1.5 border-t border-line" : ""}`}>
            {g.famille ? (
              <legend className="px-2.5 pt-1.5 pb-1 text-[11px] uppercase tracking-[0.07em] font-semibold text-faint">{g.famille}</legend>
            ) : null}
            {g.options.map((o) => (
              <label
                key={o.valeur}
                className="flex items-center gap-2.5 min-h-[40px] px-2.5 rounded-[var(--radius-s)] text-[13.4px] text-ink cursor-pointer hover:bg-surface-2 has-[:focus-visible]:bg-surface-2"
              >
                <input type="checkbox" name={name} value={o.valeur} defaultChecked={choisis.includes(o.valeur)} className="peer sr-only" />
                <span
                  aria-hidden
                  className="w-[18px] h-[18px] shrink-0 grid place-items-center rounded-[5px] border border-line bg-surface text-transparent transition-colors duration-150 peer-checked:bg-accent peer-checked:border-accent peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40"
                >
                  <Check size={13} strokeWidth={3} />
                </span>
                <span className="truncate">{o.libelle}</span>
              </label>
            ))}
          </fieldset>
        ))}
        {retenus.length ? (
          <button
            type="button"
            onClick={effacer}
            className="mt-1.5 w-full border-0 border-t border-line bg-transparent px-2.5 pt-2.5 pb-1.5 text-left text-[13px] font-semibold text-accent cursor-pointer hover:underline"
          >
            Tout décocher
          </button>
        ) : null}
      </div>
    </details>
  );
}
