import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { BoutonImprimer } from "@/components/paiement/tunnels/BoutonImprimer";
import { FormulaireRemise } from "@/components/paiement/tunnels/FormulaireRemise";
import {
  chiffre,
  PastilleCanCham,
  sigle,
  type PropsReglement,
} from "@/components/paiement/tunnels/commun";
import { ajouterJours, fmtJour } from "@/lib/agenda";
import { fmtMontant } from "@/lib/membership";

export function TunnelEspeces(
  p: PropsReglement & {
    modifier: boolean;
  },
) {
  const d = p.detail as {
    lieu?: string;
    adresse?: string;
    jour?: string;
    moment?: string;
    remisPar?: string;
  };
  const bon =
    !p.modifier &&
    Boolean(d.jour) &&
    (p.statut === "annonce" || p.statut === "reussie");

  return (
    <div
      style={
        {
          "--pf-bouton": "#2b2946",
          "--pf-sur-bouton": "#ffffff",
          "--pf-bouton-survol": "#1d1b33",
        } as CSSProperties
      }
      className="overflow-hidden rounded-[var(--radius-l)] bg-[#2b2946] px-5 pb-10 pt-6 sm:px-10 print:rounded-none print:bg-white print:p-0"
    >
      <header className="mx-auto flex max-w-[580px] items-center gap-4 text-white print:hidden">
        <Link
          href={bon ? "/membre/cotisations" : p.retour}
          aria-label={
            bon ? "Revenir aux factures" : "Choisir un autre moyen de paiement"
          }
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-white/10 text-white no-underline transition-colors duration-200 hover:bg-white/20"
        >
          <ChevronLeft size={20} />
        </Link>
        <h1 className="m-0 min-w-0 flex-1 text-[17px] font-bold">
          Règlement en espèces
        </h1>
        <PastilleCanCham />
      </header>

      <section className="mx-auto mt-6 max-w-[580px] rounded-[22px] bg-white p-6 sm:p-8 print:mt-0 print:p-0">
        {bon ? (
          <BonDeRemise {...p} d={d} />
        ) : (
          <FormulaireRemise
            reglementId={p.reglementId}
            montant={chiffre(p.montant)}
            sigle={sigle(p.devise)}
            adresseBureau={p.coordonnees.adresseBureau}
            horaires={p.coordonnees.horaires}
            aujourdhui={p.aujourdhui}
            limite={ajouterJours(p.aujourdhui, 90)}
            initial={d}
          />
        )}
      </section>
    </div>
  );
}

function BonDeRemise({
  d,
  reference,
  montant,
  devise,
  objet,
  personne,
  coordonnees: c,
  statut,
  reglementId,
}: PropsReglement & {
  d: {
    lieu?: string;
    adresse?: string;
    jour?: string;
    moment?: string;
    remisPar?: string;
  };
}) {
  const somme = fmtMontant(montant, devise);
  const ou =
    d.lieu === "domicile"
      ? (d.adresse ?? "Chez vous")
      : c.adresseBureau.replace(/\s*\n\s*/g, ", ");
  const quand = d.jour
    ? `${fmtJour(d.jour, { weekday: "long", day: "numeric", month: "long" })}, ${
        d.moment === "apres-midi" ? "l’après-midi" : "le matin"
      }`
    : "—";
  const encaisse = statut === "reussie";

  return (
    <>
      <h2 className="m-0 text-center text-[24px] font-bold text-ink print:hidden">
        Votre bon de remise
      </h2>

      <div className="relative mx-auto mt-6 flex max-w-[500px] items-center">
        <section
          aria-label="Bon de remise"
          className="relative z-10 min-w-0 flex-1 rounded-[12px] bg-[#f3df8b] p-5 shadow-[0_18px_34px_-22px_rgba(43,41,70,0.7)] print:shadow-none"
        >
          <div className="flex items-start justify-between gap-3">
            <Image
              src="/marque/logo-couleur.png"
              alt="IMPACT 261"
              width={1600}
              height={647}
              className="h-9 w-auto object-contain"
            />
            <span className="font-[family-name:var(--font-mono)] text-[12.5px] font-semibold text-[#3b3520]">
              {reference}
            </span>
          </div>
          <p className="m-0 mt-3 text-[34px] font-extrabold leading-none tracking-[-0.02em] text-[#1f1c12] tabular-nums">
            {somme}
          </p>
          <dl className="m-0 mt-3 text-[13.5px]">
            {(
              [
                ["Remis par", d.remisPar ?? personne],
                ["Pour", objet],
                ["Où", ou],
                ["Quand", quand],
              ] as const
            ).map(([libelle, valeur], i) => (
              <div
                key={libelle}
                className={`grid grid-cols-[84px_1fr] gap-3 py-2 ${
                  i ? "border-t border-dashed border-[#c9b25a]" : ""
                }`}
              >
                <dt className="text-[#5d5537]">{libelle}</dt>
                <dd className="m-0 min-w-0 font-semibold text-[#1f1c12] [overflow-wrap:anywhere]">
                  {valeur}
                </dd>
              </div>
            ))}
          </dl>
          {encaisse ? (
            <span className="absolute right-4 top-14 rotate-[-12deg] rounded-[6px] border-2 border-[#1f7a45] px-2.5 py-1 text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#1f7a45]">
              Encaissé
            </span>
          ) : null}
        </section>

        <div
          aria-hidden
          className="-ml-2 hidden w-[92px] shrink-0 rotate-[6deg] flex-col items-center gap-3 self-stretch rounded-[12px] border-l-2 border-dashed border-[#b39d45] bg-[#eed878] py-6 sm:flex"
        >
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#5d5537]">
            Souche
          </span>
          <span className="rotate-180 font-[family-name:var(--font-mono)] text-[12px] font-bold text-[#3b3520] [writing-mode:vertical-rl]">
            {reference}
          </span>
          <span className="text-[11.5px] font-semibold text-[#3b3520]">
            {somme}
          </span>
        </div>
      </div>

      <p className="m-0 mx-auto mt-5 max-w-[460px] text-center text-[14.5px] leading-relaxed text-muted print:text-black">
        {encaisse
          ? "L’équipe a reçu votre règlement. Il n’y a plus rien à faire."
          : `Montrez ce bon le jour venu : l’équipe vous remettra un reçu et confirmera votre règlement.${c.horaires ? ` Horaires : ${c.horaires.replace(/\.?\s*$/, ".")}` : ""}`}
      </p>

      <div className="print:hidden">
        <Link
          href="/membre/cotisations"
          className="mt-6 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[12px] bg-[var(--pf-bouton)] px-6 text-[15px] font-bold text-white no-underline transition-colors duration-200 hover:bg-[var(--pf-bouton-survol)]"
        >
          Voir mes factures <ArrowRight size={17} />
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6">
          <BoutonImprimer className="text-[#2b2946] hover:text-black">
            Imprimer le bon
          </BoutonImprimer>
          {encaisse ? null : (
            <Link
              href={`/membre/cotisations/payer/${reglementId}?modifier=1`}
              className="inline-flex min-h-11 items-center text-[14px] font-semibold text-[#2b2946] underline underline-offset-4 hover:text-black"
            >
              Changer le rendez-vous
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
