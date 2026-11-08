import Link from "next/link";
import { Mail, Sparkles } from "lucide-react";
import { Onglets, Panneau } from "@/components/admin/ui";
import { GrilleSuggestions, ListeRelations } from "@/components/maillage/PanneauxMaillage";
import {
  AnnuairePage,
  type ParametresAnnuaire,
} from "@/components/pages/AnnuairePage";
import { Saillant, ViewHead } from "@/components/ui";
import { relations, suggestions } from "@/lib/maillage-donnees";

type Onglet = "annuaire" | "ia" | "relations";

// Annuaire (équipe) : les fiches des membres, les suggestions de mises en relation et celles déjà faites
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<ParametresAnnuaire & { onglet?: string }>;
}) {
  const p = await searchParams;
  const onglet: Onglet = p.onglet === "ia" || p.onglet === "relations" ? p.onglet : "annuaire";
  const [sugg, rels] = await Promise.all([suggestions(), relations()]);

  const action = (
    <Link href="/admin/newsletter/nouvelle" className="btn-contour btn-contour-sm text-ink no-underline">
      <Mail size={15} /> Écrire aux membres
    </Link>
  );
  const onglets = (
    <Onglets
      actif={onglet}
      onglets={[
        { cle: "annuaire", libelle: "Annuaire", href: "/admin/annuaire" },
        { cle: "ia", libelle: "Suggestions IA", href: "/admin/annuaire?onglet=ia", compte: sugg.length },
        { cle: "relations", libelle: "Mises en relation", href: "/admin/annuaire?onglet=relations", compte: rels.length },
      ]}
    />
  );

  if (onglet === "annuaire") {
    return <AnnuairePage espace="admin" searchParams={searchParams} action={action} onglets={onglets} />;
  }

  return (
    <>
      <ViewHead title={<>Annuaire des {<Saillant>membres</Saillant>}</>} action={action} />
      {onglets}

      {onglet === "ia" ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-[var(--radius-l)] border border-dashed border-success p-4 bg-[linear-gradient(180deg,var(--success-soft),var(--surface)_85%)]">
            <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold tracking-[0.1em] uppercase text-success-strong">
              <Sparkles size={13} /> Comment une mise en relation est proposée
            </span>
            <p className="m-0 mt-2 text-[13.4px] text-ink leading-relaxed max-w-[110ch]">
              Une paire n’est proposée que si l’un des membres <b>recherche</b> ce que l’autre <b>propose</b> (leurs étiquettes de maillage),
              et que ce besoin se retrouve dans ce que le membre a écrit (fiche, motivation ou questionnaire). Chaque paire reçoit alors un score :
              le besoin couvert d’abord, puis les intérêts communs et le lien Canada–Madagascar. Trois suggestions au plus par membre ;
              une paire mise en relation ou écartée ne revient pas. « Mettre en relation » prévient les deux membres.
            </p>
          </div>
          <GrilleSuggestions suggestions={sugg} retour="/admin/annuaire?onglet=ia" />
        </div>
      ) : (
        <Panneau titre="Mises en relation" sousTitre="Les membres présentés l’un à l’autre par la Chambre" teinte="bleu">
          <ListeRelations relations={rels} espace="admin" />
        </Panneau>
      )}
    </>
  );
}
