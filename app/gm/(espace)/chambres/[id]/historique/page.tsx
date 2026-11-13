import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { EnTeteAdmin, Panneau, Vide } from "@/components/admin/ui";
import { LogoChambre } from "@/components/gm/LogoChambre";
import { fmtDateShort } from "@/lib/format";
import { historiqueChambre, HISTORIQUE_PAR_PAGE } from "@/lib/gm";

export const metadata: Metadata = { title: "Historique" };

const quand = (d: Date) => `${fmtDateShort(d.toISOString().slice(0, 10))} · ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;

// Tout l'historique d'une Chambre (la fiche n'en montre que les 20 derniers)
export default async function HistoriqueChambreGM({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> }) {
  const [{ id }, { page }] = await Promise.all([params, searchParams]);
  const n = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
  const h = await historiqueChambre(decodeURIComponent(id), n);
  if (!h) notFound();
  const fiche = `/gm/chambres/${encodeURIComponent(h.chambre.id)}`;
  const lienPage = (p: number) => `${fiche}/historique${p > 1 ? `?page=${p}` : ""}`;
  const bouton = "btn-contour btn-contour-sm text-ink hover:bg-surface-2 no-underline aria-disabled:opacity-40 aria-disabled:pointer-events-none";

  return (
    <>
      <EnTeteAdmin
        surtitre={`Chambre · ${h.total} opération${h.total > 1 ? "s" : ""}`}
        titre={
          <span className="inline-flex items-center gap-4 flex-wrap">
            <LogoChambre nom={h.chambre.nom} logo={h.chambre.profil?.logo ?? null} taille={52} />
            Historique de {h.chambre.nom}
          </span>
        }
        actions={
          <Link href={fiche} className="btn-contour btn-contour-sm text-ink hover:bg-surface-2 no-underline">
            <ArrowLeft size={14} aria-hidden /> Fiche
          </Link>
        }
      />

      <Panneau titre={h.pages > 1 ? `Page ${n} sur ${h.pages}` : "Toutes les opérations"} teinte="vert" corpsClassName="px-0 pb-0">
        {h.entrees.length ? (
          <ol className="m-0 p-0 list-none divide-y divide-line border-t border-line">
            {h.entrees.map((j) => (
              <li key={j.id} className="px-6 py-3.5 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 text-[13.5px]">
                <span className="text-ink">{j.detail ?? j.action}</span>
                <span className="text-[12.5px] text-faint whitespace-nowrap tabular-nums">{quand(j.createdAt)} · {j.acteur}</span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="px-6 pb-6"><Vide>Rien pour l’instant</Vide></div>
        )}
        {h.pages > 1 ? (
          <nav aria-label="Pages de l’historique" className="flex items-center justify-between gap-3 px-6 py-4 border-t border-line">
            <Link href={lienPage(n - 1)} aria-disabled={n <= 1} className={bouton}>
              <ChevronLeft size={14} aria-hidden /> Précédent
            </Link>
            <span className="text-[12.5px] text-muted tabular-nums">{(n - 1) * HISTORIQUE_PAR_PAGE + 1}–{Math.min(n * HISTORIQUE_PAR_PAGE, h.total)} sur {h.total}</span>
            <Link href={lienPage(n + 1)} aria-disabled={n >= h.pages} className={bouton}>
              Suivant <ChevronRight size={14} aria-hidden />
            </Link>
          </nav>
        ) : null}
      </Panneau>
    </>
  );
}
