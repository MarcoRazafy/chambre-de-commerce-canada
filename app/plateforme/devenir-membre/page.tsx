import type { Metadata } from "next";
import { ArrowRight, Building2, Search } from "lucide-react";
import { Vide } from "@/components/admin/ui";
import { LogoChambre } from "@/components/gm/LogoChambre";
import { Saisie } from "@/components/public/ChampsAuth";
import { CadrePlateforme } from "@/components/plateforme/CadrePlateforme";
import { chambresPubliques } from "@/lib/plateforme-site";

export const metadata: Metadata = { title: { absolute: "Devenir membre · L’Alliée Virtuelle" } };

// Les Chambres actives : on choisit la sienne, puis on s'inscrit à son adresse
export default async function DevenirMembre({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim().slice(0, 100);
  const chambres = await chambresPubliques(q);

  return (
    <CadrePlateforme large illustration="membres">
      <h1 className="titre text-[clamp(32px,4vw,44px)] m-0 mb-6">Devenir membre</h1>
      <form action="/devenir-membre" className="relative mb-5">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none" aria-hidden />
        <Saisie avecIcone type="search" name="q" defaultValue={q} placeholder="Rechercher une Chambre" aria-label="Rechercher une Chambre" />
      </form>

      {chambres.length ? (
        <ul className="m-0 p-0 list-none grid gap-3 sm:grid-cols-2">
          {chambres.map((c) => {
            const lieu = [c.profil?.ville, c.profil?.pays].filter(Boolean).join(", ");
            return (
              <li key={c.id}>
                <a
                  href={`${c.adresse}/auth/inscription`}
                  className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 no-underline text-ink transition-colors hover:bg-surface-2 h-full"
                >
                  <LogoChambre nom={c.nom} logo={c.profil?.logo ?? null} taille={44} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-semibold leading-snug">{c.nom}</span>
                    {lieu ? <span className="block text-[13px] text-muted mt-0.5">{lieu}</span> : null}
                  </span>
                  <ArrowRight size={16} strokeWidth={1.5} aria-hidden className="text-muted shrink-0" />
                </a>
              </li>
            );
          })}
        </ul>
      ) : (
        <Vide icone={<Building2 size={22} />}>Aucune Chambre</Vide>
      )}
    </CadrePlateforme>
  );
}
