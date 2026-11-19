"use client";

import { useEffect, useRef } from "react";
import { Palette } from "lucide-react";
import { changerFondLogo } from "@/lib/actions/profil-chambre";

const TEINTES = [
  { valeur: "", nom: "Blanc", css: "#ffffff" },
  { valeur: "#f1f5f9", nom: "Gris clair", css: "#f1f5f9" },
  { valeur: "#64748b", nom: "Gris", css: "#64748b" },
  { valeur: "#0f1d2c", nom: "Bleu nuit", css: "#0f1d2c" },
  { valeur: "#111111", nom: "Noir", css: "#111111" },
];

const ICONE =
  "w-8 h-8 rounded-full border border-line bg-white/95 text-ink grid place-items-center shadow-[var(--shadow)] cursor-pointer transition-colors hover:text-accent hover:border-accent focus-visible:outline-2 focus-visible:outline-accent list-none [&::-webkit-details-marker]:hidden";

export function FondLogo({ actuel }: { actuel: string | null }) {
  const form = useRef<HTMLFormElement>(null);
  const champ = useRef<HTMLInputElement>(null);
  const libre = useRef<HTMLInputElement>(null);
  const choisir = (v: string) => {
    if (!champ.current) return;
    champ.current.value = v;
    form.current?.requestSubmit();
  };
  useEffect(() => {
    const el = libre.current;
    if (!el) return;
    const fini = () => choisir(el.value);
    el.addEventListener("change", fini);
    return () => el.removeEventListener("change", fini);
  });
  return (
    <details className="relative">
      <summary className={ICONE} title="Couleur de fond du logo">
        <Palette size={15} />
        <span className="sr-only">Couleur de fond du logo</span>
      </summary>
      <form ref={form} action={changerFondLogo} className="absolute left-1/2 -translate-x-1/2 bottom-10 z-20 w-max rounded-[var(--radius-m)] border border-line bg-white p-3 shadow-[var(--shadow)] flex items-center gap-2">
        <input ref={champ} type="hidden" name="logoFond" defaultValue={actuel ?? ""} />
        {TEINTES.map((t) => (
          <button
            key={t.nom}
            type="button"
            title={t.nom}
            aria-label={t.nom}
            aria-pressed={(actuel ?? "") === t.valeur}
            onClick={() => choisir(t.valeur)}
            className={`size-8 rounded-full border cursor-pointer ${(actuel ?? "") === t.valeur ? "ring-2 ring-accent ring-offset-2 border-transparent" : "border-line"}`}
            style={{ backgroundColor: t.css }}
          />
        ))}
        <label title="Autre couleur" className="relative size-8 rounded-full border border-line cursor-pointer overflow-hidden" style={{ background: "conic-gradient(#ef4444,#f59e0b,#22c55e,#3b82f6,#a855f7,#ef4444)" }}>
          <span className="sr-only">Autre couleur</span>
          <input ref={libre} type="color" defaultValue={actuel ?? "#0f1d2c"} className="absolute inset-0 opacity-0 cursor-pointer" />
        </label>
      </form>
    </details>
  );
}
