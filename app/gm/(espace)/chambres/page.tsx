import type { Metadata } from "next";
import Link from "next/link";
import { Building2, ChevronRight, Search } from "lucide-react";
import { EnTeteAdmin, Onglets, Vide } from "@/components/admin/ui";
import { INPUT } from "@/components/champ-style";
import { Card, Pill, Saillant, Td, Th } from "@/components/ui";
import { fmtDateShort } from "@/lib/format";
import { listeChambres, offresPlateforme, STATUTS, type StatutAffiche } from "@/lib/gm";

export const metadata: Metadata = { title: "Chambres" };

const ONGLETS: { cle: "toutes" | StatutAffiche; libelle: string }[] = [
  { cle: "toutes", libelle: "Toutes" },
  { cle: "active", libelle: "Actives" },
  { cle: "en_retard", libelle: "En retard" },
  { cle: "suspendue", libelle: "Suspendues" },
];

const jour = (d: Date) => fmtDateShort(d.toISOString().slice(0, 10));
const fiche = (id: string) => `/gm/chambres/${encodeURIComponent(id)}`;

function Initiales({ nom }: { nom: string }) {
  const lettres = nom.split(/\s+/).filter(Boolean).map((m) => m[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span aria-hidden className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-[13px] font-bold bg-navy-soft text-navy">
      {lettres || "?"}
    </span>
  );
}

// Les Chambres clientes : recherche, statut, offre
export default async function ChambresGM({ searchParams }: { searchParams: Promise<{ q?: string; statut?: string; offre?: string }> }) {
  const sp = await searchParams;
  const [chambres, offres] = await Promise.all([listeChambres(), offresPlateforme()]);
  const statut = ONGLETS.find((o) => o.cle === sp.statut)?.cle ?? "toutes";
  const offre = offres.find((o) => o.id === sp.offre)?.id ?? "";
  const q = (sp.q ?? "").trim().toLowerCase();

  const cherchees = chambres.filter(
    (c) => (!q || [c.nom, c.slug, c.domaine ?? ""].some((v) => v.toLowerCase().includes(q))) && (!offre || c.offre.id === offre),
  );
  const visibles = statut === "toutes" ? cherchees : cherchees.filter((c) => c.statut === statut);
  const lien = (s: string) => `/gm/chambres?${new URLSearchParams({ ...(s !== "toutes" ? { statut: s } : {}), ...(q ? { q } : {}), ...(offre ? { offre } : {}) })}`;

  return (
    <>
      <EnTeteAdmin surtitre="Plateforme" titre={<>Les <Saillant>Chambres</Saillant></>} />

      <Onglets
        actif={statut}
        onglets={ONGLETS.map((o) => ({
          cle: o.cle,
          libelle: o.libelle,
          href: lien(o.cle),
          compte: o.cle === "toutes" ? cherchees.length : cherchees.filter((c) => c.statut === o.cle).length,
        }))}
        fin={
          <form action="/gm/chambres" className="flex gap-2 items-center w-full sm:w-auto">
            {statut !== "toutes" ? <input type="hidden" name="statut" value={statut} /> : null}
            <div className="relative min-w-0 flex-1 sm:flex-none sm:w-[220px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" aria-hidden />
              <input type="search" name="q" defaultValue={sp.q ?? ""} placeholder="Rechercher" aria-label="Rechercher une Chambre" className={`${INPUT} pl-9`} />
            </div>
            <select name="offre" defaultValue={offre} aria-label="Offre" className={`${INPUT} !w-[150px] shrink-0`}>
              <option value="">Toutes les offres</option>
              {offres.map((o) => <option key={o.id} value={o.id}>{o.nom}</option>)}
            </select>
            <button type="submit" className="btn-contour btn-contour-sm text-ink hover:bg-surface-2">OK</button>
          </form>
        }
      />

      {visibles.length ? (
        <>
          <Card className="hidden md:block p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13.3px] [&_tbody_tr:last-child_td]:border-b-0">
                <thead>
                  <tr>
                    <Th>Chambre</Th>
                    <Th>Offre</Th>
                    <Th>Statut</Th>
                    <Th className="text-right">Membres</Th>
                    <Th className="text-right">Équipe</Th>
                    <Th>Dernier paiement</Th>
                    <Th>Créée le</Th>
                    <Th><span className="sr-only">Ouvrir</span></Th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((c) => (
                    <tr key={c.id} className="group hover:bg-surface-2">
                      <Td>
                        <Link href={fiche(c.id)} className="flex items-center gap-3 no-underline text-ink">
                          <Initiales nom={c.nom} />
                          <span className="min-w-0">
                            <span className="block font-semibold group-hover:text-accent">{c.nom}</span>
                            <span className="block text-[12px] text-faint">{c.domaine ?? c.slug}</span>
                          </span>
                        </Link>
                      </Td>
                      <Td>{c.offre.nom}</Td>
                      <Td><Pill tone={STATUTS[c.statut].ton}>{STATUTS[c.statut].libelle}</Pill></Td>
                      <Td className="text-right tabular-nums">{c.membres}</Td>
                      <Td className="text-right tabular-nums">{c.equipe}</Td>
                      <Td className="whitespace-nowrap">{c.dernierPaiement ? jour(c.dernierPaiement) : <span className="text-faint">—</span>}</Td>
                      <Td className="whitespace-nowrap">{jour(c.creeLe)}</Td>
                      <Td className="text-right">
                        <Link href={fiche(c.id)} aria-label={`Ouvrir la fiche de ${c.nom}`} className="inline-flex w-8 h-8 rounded-lg items-center justify-center text-faint hover:text-ink hover:bg-surface">
                          <ChevronRight size={17} aria-hidden />
                        </Link>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <ul className="md:hidden list-none m-0 p-0 flex flex-col gap-3">
            {visibles.map((c) => (
              <li key={c.id}>
                <Card className="carte-filet filet-degrade p-4">
                  <Link href={fiche(c.id)} className="block no-underline text-ink">
                    <div className="flex items-center gap-3">
                      <Initiales nom={c.nom} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-[14.5px] truncate">{c.nom}</span>
                        <span className="block text-[12.5px] text-muted truncate">{c.domaine ?? c.slug}</span>
                      </span>
                      <ChevronRight size={17} className="text-faint shrink-0" aria-hidden />
                    </div>
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <Pill tone={STATUTS[c.statut].ton}>{STATUTS[c.statut].libelle}</Pill>
                      <span className="text-[12.5px] text-muted">Offre {c.offre.nom}</span>
                    </div>
                    <dl className="m-0 mt-3 pt-3 border-t border-line grid grid-cols-3 gap-2 text-[12px]">
                      <div><dt className="text-muted">Membres</dt><dd className="m-0 font-semibold tabular-nums">{c.membres}</dd></div>
                      <div><dt className="text-muted">Équipe</dt><dd className="m-0 font-semibold tabular-nums">{c.equipe}</dd></div>
                      <div><dt className="text-muted">Dernier paiement</dt><dd className="m-0 font-semibold tabular-nums">{c.dernierPaiement ? jour(c.dernierPaiement) : "—"}</dd></div>
                    </dl>
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <Vide icone={<Building2 size={22} />}>Aucune Chambre</Vide>
      )}
    </>
  );
}
