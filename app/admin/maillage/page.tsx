import Link from "next/link";
import { BellRing } from "lucide-react";
import { EnTeteAdmin, Onglets, Panneau } from "@/components/admin/ui";
import { ListeRelations, ListeSuggestions } from "@/components/maillage/PanneauxMaillage";
import { Saillant } from "@/components/ui";
import { relancerMaillage } from "@/lib/actions/maillage";
import { fmtDate } from "@/lib/format";
import { relations, suggestions, suiviMaillage } from "@/lib/maillage-donnees";

// Maillage (équipe) : les suggestions de mises en relation, celles déjà faites, et le suivi du questionnaire
// Filtres du questionnaire : qui l'a rempli, qui l'a commencé, qui ne l'a pas encore ouvert
const ETATS = [
  { cle: "", libelle: "Tous" },
  { cle: "rempli", libelle: "Rempli" },
  { cle: "en-cours", libelle: "Commencé" },
  { cle: "vide", libelle: "Pas commencé" },
] as const;
const etatDe = (s: { pct: number; faites: number }) => (s.pct === 100 ? "rempli" : s.faites > 0 ? "en-cours" : "vide");

export default async function MaillagePage({ searchParams }: { searchParams: Promise<{ onglet?: string; etat?: string }> }) {
  const sp = await searchParams;
  const onglet = sp.onglet ?? "suggestions";
  const etat = ETATS.some((e) => e.cle === sp.etat) ? sp.etat! : "";
  const [sugg, rels, suivi] = await Promise.all([suggestions(), relations(), suiviMaillage()]);
  const termines = suivi.filter((s) => s.pct === 100).length;
  const affiches = etat ? suivi.filter((s) => etatDe(s) === etat) : suivi;

  return (
    <>
      <EnTeteAdmin surtitre="Membres" titre={<>Le <Saillant>maillage</Saillant></>} />
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
          <div className="flex flex-wrap gap-1.5 mb-3" role="group" aria-label="Filtrer les membres">
            {ETATS.map((e) => {
              const n = e.cle ? suivi.filter((s) => etatDe(s) === e.cle).length : suivi.length;
              const actif = etat === e.cle;
              return (
                <Link key={e.cle || "tous"} href={`/admin/maillage?onglet=questionnaire${e.cle ? `&etat=${e.cle}` : ""}`} aria-current={actif ? "true" : undefined}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.8px] font-semibold no-underline transition-colors duration-150 ${actif ? "border-accent bg-accent text-white" : "border-line bg-surface text-ink hover:border-accent hover:text-accent"}`}>
                  {e.libelle}
                  <span className={`tabular-nums text-[11.5px] ${actif ? "text-white/85" : "text-muted"}`}>{n}</span>
                </Link>
              );
            })}
          </div>
          {!affiches.length ? <p className="m-0 py-4 text-[13px] text-muted">Aucun membre dans ce cas.</p> : null}
          <ul className="list-none m-0 p-0">
            {affiches.map((s) => (
              <li key={s.id} className="border-t border-line first:border-t-0 flex flex-wrap items-center gap-3 py-3">
                <Link href={`/admin/membres/${s.id}?onglet=maillage`} className="min-w-[180px] flex-1 font-semibold text-ink no-underline hover:text-accent">{s.nom}</Link>
                <span className="w-[200px] max-w-full">
                  <span className="block h-1.5 rounded-full bg-surface-3 overflow-hidden"><i className="block h-full rounded-full" style={{ width: `${s.pct}%`, background: "var(--bouton-rouge)" }} /></span>
                  <span className="text-[12px] text-muted">{s.faites}/{s.total}{s.relanceLe ? ` · relancé le ${fmtDate(s.relanceLe.slice(0, 10))}` : ""}</span>
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
