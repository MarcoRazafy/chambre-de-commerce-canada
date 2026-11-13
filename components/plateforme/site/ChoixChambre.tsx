"use client";

// Choix de sa Chambre (page Devenir membre) : la recherche filtre la liste pendant la saisie, sans bouton ; des filtres
// par pays quand il y en a plusieurs ; jamais de cul-de-sac : sans résultat, des suggestions. L'adresse de la page
// garde la recherche (?q=) pour qu'on puisse la partager.
import { useId, useMemo, useState, type ReactNode } from "react";
import { ArrowRight, Building2, Search, X } from "lucide-react";
import { LogoChambre } from "@/components/gm/LogoChambre";

export type ChambrePublique = { id: string; nom: string; adresse: string; profil: { ville: string | null; pays: string | null; logo: string | null } | null };

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marque-nuit";
const FILETS = ["filet-vert", "filet-rouge", "filet-degrade"];

// Comparaison sans accents ni majuscules
const plat = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function ChoixChambre({ chambres, initiale, avant, illustration }: { chambres: ChambrePublique[]; initiale: string; avant: ReactNode; illustration: ReactNode }) {
  const id = useId();
  const [q, setQ] = useState(initiale);
  const [pays, setPays] = useState("");

  const lesPays = useMemo(() => Array.from(new Set(chambres.map((c) => c.profil?.pays).filter((p): p is string => !!p))).sort(), [chambres]);
  const visibles = useMemo(() => {
    const cle = plat(q.trim());
    return chambres.filter((c) => (!pays || c.profil?.pays === pays) && (!cle || plat(`${c.nom} ${c.profil?.ville ?? ""} ${c.profil?.pays ?? ""}`).includes(cle)));
  }, [chambres, q, pays]);
  const n = visibles.length;

  const chercher = (valeur: string) => {
    setQ(valeur);
    const url = new URL(window.location.href);
    if (valeur.trim()) url.searchParams.set("q", valeur.trim());
    else url.searchParams.delete("q");
    window.history.replaceState(null, "", url);
  };

  return (
    <>
      {/* Accroche : le titre, la recherche, les repères ; l'illustration à droite */}
      <section className="border-b border-line">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 pt-12 sm:pt-16 lg:pt-20 pb-14 lg:pb-20 grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center">
          <div className="entree max-w-[640px]">
            {avant}
            <form role="search" onSubmit={(e) => e.preventDefault()} className="entree entree-2 mt-8 w-full max-w-[560px]">
              <label htmlFor={`${id}-q`} className="sr-only">
                Rechercher une Chambre
              </label>
              <div className="relative">
                <Search size={20} strokeWidth={1.5} className="absolute left-5 top-1/2 -translate-y-1/2 text-faint pointer-events-none" aria-hidden />
                <input
                  id={`${id}-q`}
                  type="search"
                  value={q}
                  onChange={(e) => chercher(e.target.value)}
                  placeholder="Nom, ville ou pays"
                  autoComplete="off"
                  enterKeyHint="search"
                  aria-controls={`${id}-resultats`}
                  className="w-full h-14 rounded-[14px] pl-13 pr-14 text-[16px] outline-none border border-line-champ bg-surface text-ink placeholder:text-faint shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-[border-color,box-shadow] focus-visible:border-marque-nuit/40 focus-visible:ring-4 focus-visible:ring-marque-nuit/10 [&::-webkit-search-cancel-button]:hidden"
                />
                {q ? (
                  <button
                    type="button"
                    onClick={() => chercher("")}
                    aria-label="Effacer la recherche"
                    className={`absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center size-11 rounded-[10px] border-0 bg-transparent text-muted cursor-pointer hover:bg-surface-2 hover:text-ink ${FOCUS}`}
                  >
                    <X size={18} strokeWidth={1.5} aria-hidden />
                  </button>
                ) : null}
              </div>
            </form>
          </div>
          {illustration}
        </div>
      </section>

      {/* Les Chambres */}
      <section id={`${id}-resultats`} className="bg-surface border-b border-line" aria-live="polite">
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-14 lg:py-20">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
            <h2 className="m-0 text-[clamp(24px,3vw,32px)] leading-[1.15] text-ink">
              {n ? `${n} Chambre${n > 1 ? "s" : ""}` : "Aucune Chambre"}
              {q.trim() ? <span className="text-muted font-normal"> pour « {q.trim()} »</span> : null}
            </h2>
            {lesPays.length > 1 ? (
              <div role="group" aria-label="Pays" className="flex flex-wrap gap-2">
                {["", ...lesPays].map((p) => (
                  <button
                    key={p || "tous"}
                    type="button"
                    aria-pressed={pays === p}
                    onClick={() => setPays(p)}
                    className={`inline-flex items-center min-h-[40px] px-4 rounded-full border text-[14px] font-medium cursor-pointer transition-colors ${
                      pays === p ? "border-marque-nuit bg-marque-nuit text-white" : "border-line-champ bg-transparent text-ink hover:bg-surface-2"
                    } ${FOCUS}`}
                  >
                    {p || "Tous les pays"}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {n ? (
            <ul className="mt-8 m-0 p-0 list-none grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibles.map((c, i) => {
                const lieu = [c.profil?.ville, c.profil?.pays].filter(Boolean).join(", ");
                return (
                  <li key={c.id} className="grid anim-fondu">
                    <a
                      href={c.adresse}
                      className={`group carte-filet ${FILETS[i % FILETS.length]} flex flex-col rounded-2xl border border-line bg-bg p-6 no-underline text-ink ${FOCUS}`}
                    >
                      <LogoChambre nom={c.nom} logo={c.profil?.logo ?? null} taille={56} />
                      <span className="block mt-5 text-[18px] font-semibold leading-snug">{c.nom}</span>
                      {lieu ? <span className="block mt-1 text-[14px] text-muted">{lieu}</span> : null}
                      <span className="mt-6 inline-flex items-center gap-2 text-[15px] font-medium text-marque-vert">
                        Demander une adhésion
                        <ArrowRight size={16} strokeWidth={1.5} aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5" />
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-line-champ px-6 py-12 text-center anim-fondu">
              <span className="mx-auto grid place-items-center size-12 rounded-full bg-surface-2 text-muted">
                <Building2 size={22} strokeWidth={1.5} aria-hidden />
              </span>
              <p className="mt-4 mb-0 text-[17px] font-medium text-ink">Aucune Chambre ne correspond.</p>
              <p className="mt-1 mb-0 text-[15px] text-muted">Essayez un autre nom, une ville, ou choisissez ci-dessous.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {chambres.slice(0, 6).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setPays("");
                      chercher(c.nom);
                    }}
                    className={`inline-flex items-center min-h-[40px] px-4 rounded-full border border-line-champ bg-surface text-[14px] font-medium text-ink cursor-pointer hover:bg-surface-2 ${FOCUS}`}
                  >
                    {c.nom}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setPays("");
                    chercher("");
                  }}
                  className={`inline-flex items-center min-h-[40px] px-4 rounded-full border border-marque-nuit bg-marque-nuit text-[14px] font-medium text-white cursor-pointer hover:bg-[#1b2c3f] ${FOCUS}`}
                >
                  Toutes les Chambres
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
