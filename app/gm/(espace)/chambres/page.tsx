import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Search } from "lucide-react";
import { EnTeteAdmin, Onglets, Vide } from "@/components/admin/ui";
import { INPUT } from "@/components/champ-style";
import { Pill, Saillant, TableWrap, Td, Th } from "@/components/ui";
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
      <EnTeteAdmin surtitre="Admin GM" titre={<Saillant>Chambres</Saillant>} />

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
        <TableWrap>
          <thead>
            <tr>
              <Th>Chambre</Th>
              <Th>Offre</Th>
              <Th>Statut</Th>
              <Th className="text-right">Membres</Th>
              <Th className="text-right">Équipe</Th>
              <Th>Dernier paiement</Th>
              <Th>Créée le</Th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((c) => (
              <tr key={c.id} className="hover:bg-surface-2">
                <Td>
                  <Link href={`/gm/chambres/${encodeURIComponent(c.id)}`} className="font-semibold text-ink no-underline hover:text-accent">{c.nom}</Link>
                  <div className="text-[12px] text-faint">{c.domaine ?? c.slug}</div>
                </Td>
                <Td>{c.offre.nom}</Td>
                <Td><Pill tone={STATUTS[c.statut].ton}>{STATUTS[c.statut].libelle}</Pill></Td>
                <Td className="text-right tabular-nums">{c.membres}</Td>
                <Td className="text-right tabular-nums">{c.equipe}</Td>
                <Td className="whitespace-nowrap">{c.dernierPaiement ? jour(c.dernierPaiement) : <span className="text-faint">—</span>}</Td>
                <Td className="whitespace-nowrap">{jour(c.creeLe)}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      ) : (
        <Vide icone={<Building2 size={22} />}>Aucune Chambre</Vide>
      )}
    </>
  );
}
