import Link from "next/link";
import { BellRing } from "lucide-react";
import { EnTeteAdmin, Onglets, Panneau } from "@/components/admin/ui";
import { ListeRelations, ListeSuggestions } from "@/components/maillage/PanneauxMaillage";
import { Saillant } from "@/components/ui";
import { relancerMaillage } from "@/lib/actions/maillage";
import { fmtDate } from "@/lib/format";
import { relations, suggestions, suiviMaillage } from "@/lib/maillage-donnees";

// Maillage (équipe) : les suggestions de mises en relation, celles déjà faites, et le suivi du questionnaire
export default async function MaillagePage({ searchParams }: { searchParams: Promise<{ onglet?: string }> }) {
  const onglet = (await searchParams).onglet ?? "suggestions";
  const [sugg, rels, suivi] = await Promise.all([suggestions(), relations(), suiviMaillage()]);
  const termines = suivi.filter((s) => s.pct === 100).length;

  return (
    <>
      <EnTeteAdmin surtitre="Membres" titre={<>Le <Saillant>maillage</Saillant></>}>
        Des mises en relation entre membres, seulement quand l’un a exprimé un besoin que l’autre propose.
      </EnTeteAdmin>
      <Onglets
        actif={onglet}
        onglets={[
          { cle: "suggestions", libelle: "Suggestions", href: "/admin/maillage", compte: sugg.length },
          { cle: "relations", libelle: "Mises en relation", href: "/admin/maillage?onglet=relations", compte: rels.length },
          { cle: "questionnaire", libelle: "Questionnaire", href: "/admin/maillage?onglet=questionnaire", compte: suivi.length - termines },
        ]}
      />

      {onglet === "suggestions" ? (
        <Panneau titre="Suggestions" sousTitre="Les meilleurs rapprochements de chaque membre (trois au plus par membre)" teinte="rouge">
          <ListeSuggestions suggestions={sugg} espace="admin" retour="/admin/maillage" />
        </Panneau>
      ) : null}

      {onglet === "relations" ? (
        <Panneau titre="Mises en relation" teinte="bleu">
          <ListeRelations relations={rels} espace="admin" />
        </Panneau>
      ) : null}

      {onglet === "questionnaire" ? (
        <Panneau titre="Questionnaire de maillage" sousTitre={`${termines} membre${termines > 1 ? "s" : ""} sur ${suivi.length} ont répondu à tout`} teinte="degrade" corpsClassName="px-6 pb-4">
          <ul className="list-none m-0 p-0">
            {suivi.map((s) => (
              <li key={s.id} className="border-t border-line first:border-t-0 flex flex-wrap items-center gap-3 py-3">
                <Link href={`/admin/membres/${s.id}?onglet=maillage`} className="min-w-[180px] flex-1 font-semibold text-ink no-underline hover:text-accent">{s.nom}</Link>
                <span className="w-[200px] max-w-full">
                  <span className="block h-1.5 rounded-full bg-surface-3 overflow-hidden"><i className="block h-full rounded-full" style={{ width: `${s.pct}%`, background: "var(--bouton-rouge)" }} /></span>
                  <span className="text-[12px] text-muted">{s.faites}/{s.total}{s.relanceLe ? ` · relancé le ${fmtDate(s.relanceLe)}` : ""}</span>
                </span>
                {s.pct < 100 ? (
                  <form action={relancerMaillage}>
                    <input type="hidden" name="memberId" value={s.id} />
                    <button type="submit" className="btn-contour btn-contour-sm text-ink"><BellRing size={14} /> Relancer</button>
                  </form>
                ) : <span className="text-[12.5px] font-semibold text-success">Complété</span>}
              </li>
            ))}
          </ul>
        </Panneau>
      ) : null}
    </>
  );
}
