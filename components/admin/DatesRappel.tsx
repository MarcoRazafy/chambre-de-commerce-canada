"use client";

import { useState } from "react";
import { CalendarClock, Plus, X } from "lucide-react";

const CHAMP = "rounded-[var(--radius-s)] border border-line bg-surface text-ink px-3 py-2.5 text-[13.6px] outline-none focus:border-accent";
let cle = 0;

// Dates et heures d'envoi d'un rappel (heure de Madagascar) : une ou plusieurs, avant le début de l'événement
export function DatesRappel({ initiales, suggestion, max, limite }: { initiales: string[]; suggestion: string; max: number; limite: string }) {
  const [dates, setDates] = useState(() => (initiales.length ? initiales : [suggestion]).map((v) => ({ cle: cle++, v })));
  return (
    <div className="flex flex-col gap-2">
      {dates.map((d, i) => (
        <div key={d.cle} className="flex items-center gap-2">
          <CalendarClock size={16} className="text-muted shrink-0" aria-hidden />
          <input
            type="datetime-local"
            name="dates"
            required
            max={limite}
            value={d.v}
            onChange={(e) => setDates((l) => l.map((x) => (x.cle === d.cle ? { ...x, v: e.target.value } : x)))}
            aria-label={`Date et heure d’envoi ${i + 1}`}
            className={CHAMP}
          />
          {dates.length > 1 ? (
            <button type="button" onClick={() => setDates((l) => l.filter((x) => x.cle !== d.cle))} aria-label="Retirer cette date"
              className="w-9 h-9 grid place-items-center rounded-[var(--radius-s)] border border-line bg-surface text-muted cursor-pointer hover:text-bad hover:border-bad">
              <X size={15} />
            </button>
          ) : null}
        </div>
      ))}
      {dates.length < max ? (
        <button type="button" onClick={() => setDates((l) => [...l, { cle: cle++, v: l.at(-1)?.v ?? suggestion }])}
          className="self-start inline-flex items-center gap-1 rounded-full border border-dashed border-line bg-transparent px-3 py-1.5 text-[12.5px] font-semibold text-muted cursor-pointer hover:border-accent hover:text-accent">
          <Plus size={13} /> Ajouter une date
        </button>
      ) : null}
    </div>
  );
}
