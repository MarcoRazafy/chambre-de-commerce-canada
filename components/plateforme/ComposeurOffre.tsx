"use client";

// Offre à la carte : la Chambre coche ses fonctions, le prix se calcule en direct.
//  - « site » : tarifs du site (fond sombre), avec le nombre de comptes d'équipe et le lien de création ;
//  - « champ » : dans un formulaire (création d'une Chambre, abonnement), cases « fonctions » envoyées avec lui.
import Link from "next/link";
import { useId, useState } from "react";
import { ArrowRight, Check, Minus, Plus } from "lucide-react";
import { fmtDollars } from "@/lib/plateforme";

export type OptionOffre = { cle: string; libelle: string; prix: number };
export type OffreComposable = { id: string; nom: string; base: number; parUtilisateur: number; offerts: number; options: OptionOffre[] };

const cents = (n: number) => Math.round(n * 100) / 100;
const COMPTES_MAX = 50;

function calcul(o: OffreComposable, choisies: readonly string[], comptes: number) {
  const fonctions = cents(o.options.filter((x) => choisies.includes(x.cle)).reduce((t, x) => t + x.prix, 0));
  const enPlus = Math.max(0, comptes - o.offerts);
  const equipe = cents(enPlus * o.parUtilisateur);
  return { fonctions, enPlus, equipe, total: cents(o.base + fonctions + equipe) };
}

const prixOption = (p: number) => (p > 0 ? `+${fmtDollars(p)}` : "Inclus");

export function ComposeurOffre({
  offre,
  initiales,
  mode,
  equipe = 1,
}: {
  offre: OffreComposable;
  initiales: readonly string[];
  mode: "site" | "champ";
  /** Mode « champ » : les comptes de l'équipe aujourd'hui */
  equipe?: number;
}) {
  const id = useId();
  const [choisies, setChoisies] = useState<string[]>(() => offre.options.map((x) => x.cle).filter((c) => initiales.includes(c)));
  const [comptes, setComptes] = useState(Math.max(1, equipe));
  const c = calcul(offre, choisies, mode === "site" ? comptes : equipe);
  const tout = choisies.length === offre.options.length;
  const sombre = mode === "site";

  const basculer = (cle: string) => setChoisies((l) => (l.includes(cle) ? l.filter((x) => x !== cle) : [...l, cle]));
  const toutBasculer = () => setChoisies(tout ? [] : offre.options.map((x) => x.cle));

  const options = (
    <fieldset className="m-0 p-0 border-0 min-w-0">
      <legend className="sr-only">Vos fonctions</legend>
      <div className="flex items-center justify-between gap-3 mb-2">
        <span aria-hidden className={`text-[14px] font-bold ${sombre ? "text-white" : "text-ink"}`}>Vos fonctions</span>
        <button
          type="button"
          onClick={toutBasculer}
          className={`min-h-[36px] -mr-2 px-2 rounded-md bg-transparent border-0 text-[13px] font-semibold underline-offset-4 hover:underline cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 ${
            sombre ? "text-white/80 focus-visible:outline-white" : "text-muted focus-visible:outline-marque-nuit"
          }`}
        >
          {tout ? "Tout décocher" : "Tout cocher"}
        </button>
      </div>
      <div className={`grid gap-2 ${sombre ? "sm:grid-cols-2" : ""}`}>
        {offre.options.map((x) => (
          <label
            key={x.cle}
            className={`group flex items-center gap-3 min-h-[48px] rounded-[10px] border px-4 py-2 cursor-pointer select-none transition-colors has-focus-visible:ring-2 ${
              sombre
                ? "border-white/12 bg-white/[0.04] hover:bg-white/[0.08] has-checked:border-white/35 has-checked:bg-white/[0.11] has-focus-visible:ring-white/60"
                : "border-line bg-white hover:bg-surface-2 has-checked:border-marque-vert has-checked:bg-marque-vert/[0.05] has-focus-visible:ring-marque-vert/30"
            }`}
          >
            <input
              type="checkbox"
              name={mode === "champ" ? "fonctions" : undefined}
              value={x.cle}
              checked={choisies.includes(x.cle)}
              onChange={() => basculer(x.cle)}
              className="sr-only"
            />
            <span
              aria-hidden
              className={`grid place-items-center size-5 shrink-0 rounded-[6px] border-2 transition-colors group-has-checked:border-marque-vert group-has-checked:bg-marque-vert ${
                sombre ? "border-white/40" : "border-[#c5cdd8] bg-white"
              }`}
            >
              <Check size={13} strokeWidth={3.2} className="text-white opacity-0 group-has-checked:opacity-100" />
            </span>
            <span className={`flex-1 min-w-0 text-[14.5px] font-medium ${sombre ? "text-white" : "text-ink"}`}>{x.libelle}</span>
            <span className={`text-[13.5px] font-semibold tabular-nums whitespace-nowrap ${sombre ? "text-white/70" : "text-muted"}`}>{prixOption(x.prix)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );

  const ligne = `flex items-baseline justify-between gap-3 text-[14px] tabular-nums ${sombre ? "text-white/75" : "text-muted"}`;
  const resume = (
    <div className="flex flex-col gap-2">
      <div className={ligne}><span>Forfait de base</span><span>{fmtDollars(offre.base)}</span></div>
      <div className={ligne}>
        <span>{choisies.length} fonction{choisies.length > 1 ? "s" : ""}</span>
        <span>{fmtDollars(c.fonctions)}</span>
      </div>
      {offre.parUtilisateur > 0 ? (
        <div className={ligne}>
          <span>{c.enPlus} compte{c.enPlus > 1 ? "s" : ""} d’équipe en plus</span>
          <span>{fmtDollars(c.equipe)}</span>
        </div>
      ) : null}
      <div className={`mt-2 pt-3 border-t flex items-baseline justify-between gap-3 ${sombre ? "border-white/15" : "border-line"}`}>
        <span className={`text-[14px] font-semibold ${sombre ? "text-white" : "text-ink"}`}>Total</span>
        <span aria-live="polite" className="text-right">
          <span className={`block text-[30px] leading-none font-semibold tabular-nums ${sombre ? "text-white" : "text-ink"}`}>{fmtDollars(c.total)}</span>
          <span className={`block mt-1 text-[12.5px] ${sombre ? "text-white/60" : "text-muted"}`}>par mois, avant taxes</span>
        </span>
      </div>
    </div>
  );

  if (mode === "champ") {
    return (
      <div className="flex flex-col gap-4">
        {options}
        <div className="rounded-[12px] border border-line bg-surface-2 p-4">{resume}</div>
      </div>
    );
  }

  const bouton = "grid place-items-center size-11 rounded-lg border border-white/20 bg-white/[0.06] text-white cursor-pointer transition-colors hover:bg-white/[0.14] disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
  const lien = `/creer-une-chambre?${new URLSearchParams({ offre: offre.id, fonctions: choisies.join(",") })}`;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] items-start">
      {options}
      <div className="rounded-[14px] border border-white/10 bg-white/[0.05] p-5 sm:p-6 flex flex-col gap-5">
        <div>
          <div className="flex items-center justify-between gap-3">
            <span id={`${id}-comptes`} className="text-[14px] font-bold text-white">Comptes d’équipe</span>
            <div role="group" aria-labelledby={`${id}-comptes`} className="flex items-center gap-1.5">
              <button type="button" aria-label="Un compte de moins" disabled={comptes <= 1} onClick={() => setComptes((n) => Math.max(1, n - 1))} className={bouton}>
                <Minus size={16} aria-hidden />
              </button>
              <output aria-live="polite" className="w-9 text-center text-[17px] font-bold text-white tabular-nums">{comptes}</output>
              <button type="button" aria-label="Un compte de plus" disabled={comptes >= COMPTES_MAX} onClick={() => setComptes((n) => Math.min(COMPTES_MAX, n + 1))} className={bouton}>
                <Plus size={16} aria-hidden />
              </button>
            </div>
          </div>
          {offre.parUtilisateur > 0 ? (
            <p className="mt-2 mb-0 text-[12.5px] text-white/60">
              {offre.offerts ? `${offre.offerts} offert${offre.offerts > 1 ? "s" : ""}, puis ` : ""}{fmtDollars(offre.parUtilisateur)} par compte et par mois
            </p>
          ) : null}
        </div>
        {resume}
        <Link href={lien} className="btn-action w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          Créer ma Chambre <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
        </Link>
      </div>
    </div>
  );
}
