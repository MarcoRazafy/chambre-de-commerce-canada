import Link from "next/link";
import { BellRing, Pencil, Plus } from "lucide-react";
import { EnTeteAdmin, Panneau } from "@/components/admin/ui";
import { Pill, Saillant } from "@/components/ui";
import { basculerRappelMembre } from "@/lib/actions/rappels-membres";
import { prisma } from "@/lib/db";
import { convertirRelancesAnciennes } from "@/lib/rappels-membres";
import { DECLENCHEURS, libelleRappel, type Declencheur } from "@/lib/rappels-membres-base";

const SECTIONS: { declencheur: Declencheur; titre: string; sousTitre: string; teinte: "rouge" | "bleu" }[] = [
  { declencheur: "facture", titre: "Factures impayées", sousTitre: "Au membre dont une facture reste impayée", teinte: "rouge" },
  { declencheur: "adhesion", titre: "Fin d’adhésion", sousTitre: "Au membre à jour dont l’adhésion arrive à son terme", teinte: "bleu" },
];

export default async function AdminRappels() {
  await convertirRelancesAnciennes();
  const rappels = await prisma.rappelMembre.findMany({
    orderBy: [{ jours: "asc" }],
    select: { id: true, declencheur: true, jours: true, sujet: true, actif: true, envoyes: true },
  });

  return (
    <>
      <EnTeteAdmin
        surtitre="Finances"
        titre={<>Les <Saillant>rappels</Saillant></>}
        actions={
          <>
            <Link href="/admin/rappels/nouveau?declencheur=adhesion" className="btn-contour btn-contour-sm text-ink no-underline">
              <Plus size={14} /> Rappel de fin d’adhésion
            </Link>
            <Link href="/admin/rappels/nouveau?declencheur=facture" className="btn-action btn-action-sm no-underline">
              <Plus size={14} /> Rappel de facture
            </Link>
          </>
        }
      />

      <div className="flex flex-col gap-4">
        {SECTIONS.map((s) => {
          const liste = rappels.filter((r) => r.declencheur === s.declencheur);
          return (
            <Panneau key={s.declencheur} titre={s.titre} sousTitre={s.sousTitre} teinte={s.teinte}>
              {liste.length ? (
                <ul className="m-0 p-0 list-none divide-y divide-line border-y border-line">
                  {liste.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                      <span className={`grid place-items-center w-9 h-9 rounded-full shrink-0 ${r.actif ? "bg-accent-soft text-accent" : "bg-surface-3 text-faint"}`}>
                        <BellRing size={16} />
                      </span>
                      <Link href={`/admin/rappels/${r.id}`} className="min-w-0 flex-1 no-underline group">
                        <span className="block text-[14px] font-semibold text-ink group-hover:text-accent">{libelleRappel(r)}</span>
                        <span className="block text-[12.5px] text-muted truncate">{r.sujet}</span>
                      </Link>
                      <span className="text-[12.5px] text-muted tabular-nums whitespace-nowrap">
                        {r.envoyes} envoyé{r.envoyes > 1 ? "s" : ""}
                      </span>
                      <Pill tone={r.actif ? "ok" : "muted"}>{r.actif ? "Actif" : "Coupé"}</Pill>
                      <span className="flex items-center gap-2 ml-auto">
                        <form action={basculerRappelMembre}>
                          <input type="hidden" name="id" value={r.id} />
                          <button type="submit" className="btn-contour btn-contour-sm text-ink">{r.actif ? "Couper" : "Activer"}</button>
                        </form>
                        <Link href={`/admin/rappels/${r.id}`} aria-label={`Modifier le rappel ${libelleRappel(r)}`} className="grid place-items-center w-9 h-9 rounded-[var(--radius-s)] border border-line bg-surface text-muted hover:text-ink no-underline">
                          <Pencil size={14} />
                        </Link>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="m-0 text-[13.5px] text-muted">
                  Aucun rappel.{" "}
                  <Link href={`/admin/rappels/nouveau?declencheur=${s.declencheur}`} className="font-semibold text-accent no-underline hover:underline">
                    Créer un rappel {DECLENCHEURS[s.declencheur].titre === "Facture impayée" ? "de facture" : "de fin d’adhésion"}
                  </Link>
                </p>
              )}
            </Panneau>
          );
        })}
      </div>
    </>
  );
}
