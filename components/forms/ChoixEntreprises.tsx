"use client";

import { useId, useState } from "react";
import { Search, Users } from "lucide-react";
import { INPUT } from "@/components/champ-style";
import type { MembreChoisissable } from "@/components/forms/BibliothequeOutils";

export function ChoixEntreprises({
  membres,
  initiales,
}: {
  membres: MembreChoisissable[];
  initiales: string[];
}) {
  const titre = useId();
  const [q, setQ] = useState("");
  const [choisies, setChoisies] = useState<Set<string>>(
    () => new Set(initiales),
  );
  const filtre = q.trim().toLowerCase();
  const liste = filtre
    ? membres.filter((m) => m.nom.toLowerCase().includes(filtre))
    : membres;

  const basculer = (id: string) =>
    setChoisies((v) => {
      const suite = new Set(v);
      if (suite.has(id)) suite.delete(id);
      else suite.add(id);
      return suite;
    });

  return (
    <div role="group" aria-labelledby={titre}>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span id={titre} className="text-[12.3px] font-semibold text-muted">
          Entreprises qui y ont accès
        </span>
        <span className="inline-flex items-center gap-1.5 text-[12.3px] font-semibold text-ink">
          <Users size={14} className="text-accent" />
          {choisies.size} choisie{choisies.size > 1 ? "s" : ""}
        </span>
      </div>
      {[...choisies].map((id) => (
        <input key={id} type="hidden" name="membre" value={id} />
      ))}
      <label className="relative block">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Chercher une entreprise…"
          className={`${INPUT} pl-9 rounded-b-none`}
        />
      </label>
      <div className="max-h-[220px] overflow-y-auto rounded-b-[var(--radius-s)] border border-t-0 border-line">
        {liste.length ? (
          liste.map((m) => (
            <label
              key={m.id}
              className="flex cursor-pointer items-center gap-3 border-b border-line px-3.5 py-2.5 text-[13.4px] last:border-b-0 hover:bg-surface-2"
            >
              <input
                type="checkbox"
                checked={choisies.has(m.id)}
                onChange={() => basculer(m.id)}
                className="h-4 w-4 shrink-0 accent-[var(--accent)]"
              />
              <span className="min-w-0 flex-1 truncate">{m.nom}</span>
              {m.statut !== "a_jour" ? (
                <span className="shrink-0 text-[11.5px] text-faint">
                  cotisation en retard
                </span>
              ) : null}
            </label>
          ))
        ) : (
          <p className="m-0 px-4 py-5 text-center text-[13px] text-muted">
            {filtre
              ? "Aucune entreprise ne correspond."
              : "Aucune entreprise à proposer."}
          </p>
        )}
      </div>
      <span className="mt-1 block text-[11.5px] text-faint">
        Seules ces entreprises voient le dossier, et tout ce qu’il contient.
      </span>
    </div>
  );
}
