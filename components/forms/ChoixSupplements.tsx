"use client";

import { useState } from "react";
import { fmtMoney } from "@/lib/format";
import type { Supplement } from "@/lib/supplements";

export function ChoixSupplements({
  supplements,
  base,
  onTotal,
}: {
  supplements: Supplement[];
  base: number;
  onTotal?: (parPersonne: number) => void;
}) {
  const [choisis, setChoisis] = useState<string[]>([]);
  if (!supplements.length) return null;
  const parPersonne = base + supplements.filter((s) => choisis.includes(s.id)).reduce((somme, s) => somme + s.prix, 0);

  const basculer = (id: string, coche: boolean) => {
    const suite = coche ? [...choisis, id] : choisis.filter((x) => x !== id);
    setChoisis(suite);
    onTotal?.(base + supplements.filter((s) => suite.includes(s.id)).reduce((somme, s) => somme + s.prix, 0));
  };

  return (
    <fieldset className="m-0 p-0 border-0 min-w-0">
      <legend className="text-[12.5px] font-semibold text-ink mb-1.5">Autres paiements</legend>
      <div className="flex flex-col gap-2">
        {supplements.map((s) => (
          <label
            key={s.id}
            className="flex items-center justify-between gap-3 rounded-[var(--radius-s)] border border-line bg-surface px-3.5 py-2.5 cursor-pointer hover:border-faint has-[:checked]:border-accent has-[:checked]:bg-accent-soft"
          >
            <span className="flex items-center gap-2.5 min-w-0 text-[13.5px] text-ink">
              <input
                type="checkbox"
                name="supplement"
                value={s.id}
                checked={choisis.includes(s.id)}
                onChange={(e) => basculer(s.id, e.target.checked)}
                className="size-4 shrink-0 accent-[var(--accent)]"
              />
              <span className="min-w-0">{s.libelle}</span>
            </span>
            <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink">+ {fmtMoney(s.prix)}</span>
          </label>
        ))}
      </div>
      {parPersonne > 0 ? (
        <p className="m-0 mt-2 text-[12.5px] text-muted">
          Par personne : <b className="text-ink tabular-nums">{fmtMoney(parPersonne)}</b>
        </p>
      ) : null}
    </fieldset>
  );
}
