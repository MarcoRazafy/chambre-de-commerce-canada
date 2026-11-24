"use client";

import { useState, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import {
  HAUT_DEFAUT,
  PIED2_DEFAUT,
  PIED_DEFAUT,
  stylePagePublique,
  type CouleursPage,
} from "@/lib/couleurs-evenement";

export function CouleursPagePublique({
  initiales,
  chambre,
}: {
  initiales: CouleursPage;
  chambre: CouleursPage;
}) {
  const [c, setC] = useState<CouleursPage>(initiales);
  const style = stylePagePublique(c, chambre);
  const haut = c.haut ?? chambre.haut ?? HAUT_DEFAUT;
  const pied = c.pied ?? chambre.pied ?? PIED_DEFAUT;
  const pied2 = c.pied
    ? (c.pied2 ?? c.pied)
    : chambre.pied
      ? (chambre.pied2 ?? chambre.pied)
      : PIED2_DEFAUT;

  return (
    <>
      <input type="hidden" name="couleurHaut" value={c.haut ?? ""} />
      <input type="hidden" name="couleurPied" value={c.pied ?? ""} />
      <input type="hidden" name="couleurPied2" value={c.pied ? (c.pied2 ?? "") : ""} />

      <div aria-hidden className="rounded-[10px] border border-line overflow-hidden">
        <div className="h-6 px-3 flex items-center justify-between" style={{ background: style.fondHaut }}>
          <span className={`h-2.5 w-9 rounded-sm ${style.hautSombre ? "bg-white" : "bg-surface-3"}`} />
          <span className="h-3 w-12 rounded-sm" style={{ background: style.boutonClair ? "#ffffff" : "#ad0707" }} />
        </div>
        <div className="bg-white px-3 py-3 flex flex-col gap-1.5">
          <span className="h-2.5 w-2/3 rounded-sm bg-surface-3" />
          <span className="h-1.5 w-full rounded-sm bg-surface-2" />
          <span className="h-1.5 w-5/6 rounded-sm bg-surface-2" />
        </div>
        <div className="h-8 px-3 flex items-center" style={{ background: style.fondPied }}>
          <span className={`h-1.5 w-14 rounded-sm ${style.piedSombre ? "bg-white/70" : "bg-[#16202b]/40"}`} />
        </div>
      </div>

      <Ligne libelle="Barre du haut" parDefaut={!c.haut} remettre={() => setC((x) => ({ ...x, haut: null }))}>
        <Pastille valeur={haut} libelle="Couleur de la barre du haut" onChange={(v) => setC((x) => ({ ...x, haut: v }))} />
      </Ligne>

      <Ligne libelle="Pied de page" parDefaut={!c.pied} remettre={() => setC((x) => ({ ...x, pied: null, pied2: null }))}>
        <Pastille valeur={pied} libelle="Couleur de départ du dégradé du pied de page" onChange={(v) => setC((x) => ({ ...x, pied: v, pied2: x.pied ? (x.pied2 ?? x.pied) : pied2 }))} />
        <span aria-hidden className="text-faint">→</span>
        <Pastille valeur={pied2} libelle="Couleur d’arrivée du dégradé du pied de page" onChange={(v) => setC((x) => ({ ...x, pied: x.pied ?? pied, pied2: v }))} />
      </Ligne>
    </>
  );
}

function Ligne({
  libelle,
  parDefaut,
  remettre,
  children,
}: {
  libelle: string;
  parDefaut: boolean;
  remettre: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-ink">{libelle}</span>
        {parDefaut ? (
          <span className="text-[12px] text-faint">Par défaut</span>
        ) : (
          <button
            type="button"
            onClick={remettre}
            className="inline-flex items-center gap-1 border-0 bg-transparent p-0 text-[12px] font-semibold text-muted cursor-pointer hover:text-accent"
          >
            <RotateCcw size={12} /> Par défaut
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">{children}</div>
    </div>
  );
}

function Pastille({
  valeur,
  libelle,
  onChange,
}: {
  valeur: string;
  libelle: string;
  onChange: (valeur: string) => void;
}) {
  return (
    <label className="relative inline-flex items-center gap-2 rounded-[var(--radius-s)] border border-line bg-surface pl-1.5 pr-2.5 py-1.5 cursor-pointer hover:border-faint focus-within:border-accent">
      <span className="w-7 h-7 rounded-md border border-black/10" style={{ background: valeur }} />
      <span className="font-[family-name:var(--font-mono)] text-[12.5px] text-muted uppercase">{valeur}</span>
      <input
        type="color"
        value={valeur}
        onChange={(e) => onChange(e.target.value.toLowerCase())}
        aria-label={libelle}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </label>
  );
}
