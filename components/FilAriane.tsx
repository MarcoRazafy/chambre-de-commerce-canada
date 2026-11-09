"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ChevronRight, House } from "lucide-react";
import { filPour } from "@/lib/nav";

const LIEN =
  "inline-flex items-center gap-1.5 min-h-[36px] rounded-md px-2 no-underline text-white/65 transition-colors duration-150 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60";

// Barre du haut (fixée en haut de l'écran) : le bouton « Retour », toujours visible hors de l'accueil,
// puis le fil d'Ariane : chaque niveau jusqu'à la page sur grand écran, le titre de la page sur téléphone.
export function FilAriane({ racine }: { racine: string }) {
  return (
    <Suspense fallback={<Fil racine={racine} params={null} />}>
      <FilAvecParametres racine={racine} />
    </Suspense>
  );
}

function FilAvecParametres({ racine }: { racine: string }) {
  return <Fil racine={racine} params={useSearchParams()} />;
}

function Fil({ racine, params }: { racine: string; params: URLSearchParams | null }) {
  const fil = filPour(usePathname(), racine, params);
  const parent = [...fil].reverse().find((m) => m.href);
  const courante = fil[fil.length - 1];

  return (
    <div className="flex items-center gap-3 min-w-0 shrink">
      {parent?.href ? (
        <>
          <BoutonRetour parent={parent.href} />
          <span className="hidden sm:block w-px h-6 bg-white/15 shrink-0" aria-hidden />
        </>
      ) : null}

      <nav aria-label="Fil d’Ariane" className="min-w-0 shrink text-[13.5px]">
        <span className="sm:hidden block truncate font-semibold text-white max-w-[45vw]">{courante.libelle}</span>
        <ol className="hidden sm:flex items-center gap-0.5 m-0 p-0 list-none min-w-0">
          {fil.map((m, i) => (
            <li key={`${i}-${m.libelle}`} className={`flex items-center gap-0.5 ${i === fil.length - 1 ? "min-w-0" : "shrink-0"}`}>
              {i ? <ChevronRight size={14} className="shrink-0 text-white/30" aria-hidden /> : null}
              {m.href ? (
                <Link href={m.href} className={LIEN} aria-label={i === 0 ? m.libelle : undefined}>
                  {i === 0 ? <House size={15} className="shrink-0" aria-hidden /> : null}
                  <span className={i === 0 ? "hidden lg:inline" : "truncate max-w-[180px]"}>{m.libelle}</span>
                </Link>
              ) : (
                <span aria-current="page" className="inline-flex items-center gap-1.5 px-2 min-w-0 font-semibold text-white">
                  {i === 0 ? <House size={15} className="shrink-0" aria-hidden /> : null}
                  <span className="truncate">{m.libelle}</span>
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}

// « Retour » : la page d'avant ; sans historique (lien ouvert dans un nouvel onglet), le niveau parent du fil
function BoutonRetour({ parent }: { parent: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(parent))}
      aria-label="Retour à la page précédente"
      title="Retour à la page précédente"
      className="group shrink-0 inline-flex items-center gap-1.5 h-9 w-9 sm:w-auto justify-center sm:pl-2.5 sm:pr-3.5 rounded-full border-0 bg-white text-navy text-[13px] font-bold cursor-pointer shadow-[0_1px_2px_rgb(0_0_0/0.25)] transition-[background-color,transform] duration-150 hover:bg-white/90 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy motion-reduce:transition-none"
    >
      <ArrowLeft size={16} strokeWidth={2.5} className="transition-transform duration-150 group-hover:-translate-x-0.5 motion-reduce:transition-none" aria-hidden />
      <span className="hidden sm:inline">Retour</span>
    </button>
  );
}
