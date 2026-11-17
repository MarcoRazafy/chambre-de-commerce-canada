import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronLeft } from "lucide-react";
import { BoutonCopier, Copiable } from "@/components/paiement/Copiable";
import { AnnonceAdaptative } from "@/components/paiement/tunnels/AnnonceAdaptative";
import {
  chiffre,
  conclu,
  PastilleChambre,
  sigle,
  type PropsReglement,
} from "@/components/paiement/tunnels/commun";
import { fmtMontant } from "@/lib/membership";

const MARINE = "#16355c";

export function TunnelVirement(p: PropsReglement) {
  const etape = conclu(p.statut) ? 3 : p.etape === "2" ? 2 : 1;
  const somme = fmtMontant(p.montant, p.devise);
  const page = `/membre/cotisations/payer/${p.reglementId}`;
  const precedent =
    etape === 2 ? page : etape === 3 ? "/membre/cotisations" : p.retour;

  return (
    <div
      style={
        {
          "--pf-bouton": MARINE,
          "--pf-sur-bouton": "#ffffff",
          "--pf-bouton-survol": "#0f2744",
        } as CSSProperties
      }
      className="overflow-hidden rounded-[var(--radius-l)] bg-[#f2f5f9]"
    >
      <header className="flex items-center gap-4 bg-[#16355c] px-5 py-3.5 text-white sm:px-8">
        <Link
          href={precedent}
          aria-label={
            etape === 2
              ? "Revenir au montant"
              : "Choisir un autre moyen de paiement"
          }
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-white/40 text-white no-underline transition-colors duration-200 hover:bg-white/10"
        >
          <ChevronLeft size={20} />
        </Link>
        <h1 className="m-0 min-w-0 flex-1 text-[17px] font-bold">
          Virement bancaire
        </h1>
        <PastilleChambre logo={p.logo} />
      </header>

      <div className="mx-auto max-w-[620px] px-5 pb-10 pt-6">
        <Onglets etape={etape} />

        {etape === 1 ? (
          <>
            <h2 className="m-0 mt-6 text-[26px] font-bold leading-tight text-ink">
              Le montant de votre virement
            </h2>
            <p className="m-0 mb-1.5 mt-5 text-[14px] font-semibold text-ink">
              Montant
            </p>
            <div className="flex min-h-[60px] items-center justify-between rounded-[10px] border border-line bg-white px-4">
              <output className="text-[26px] font-bold text-ink tabular-nums">
                {chiffre(p.montant)}
              </output>
              <span className="text-[16px] font-semibold text-muted">
                {sigle(p.devise)}
              </span>
            </div>
            <p className="m-0 mt-4 border-l-[3px] border-[#b08a3e] bg-white px-4 py-3 text-[14px] text-muted">
              Pour <b className="text-ink">{p.objet}</b>
              {p.numeroFacture ? ` · facture ${p.numeroFacture}` : ""}
            </p>
            <Link
              href={`${page}?etape=2`}
              className="mt-6 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--pf-bouton)] px-6 text-[15px] font-bold text-white no-underline transition-colors duration-200 hover:bg-[var(--pf-bouton-survol)]"
            >
              Obtenir les coordonnées <ArrowRight size={17} />
            </Link>
            <div className="mt-4 text-center">
              <Link
                href="/membre/cotisations"
                className="text-[14px] text-muted underline underline-offset-4 hover:text-ink"
              >
                Revenir plus tard
              </Link>
            </div>
          </>
        ) : etape === 2 ? (
          <>
            <h2 className="m-0 mt-6 text-[26px] font-bold leading-tight text-ink">
              Virez {somme} depuis votre banque
            </h2>
            <CarteRib {...p} />

            <div className="mt-4 flex flex-wrap items-center gap-4 rounded-[12px] border border-dashed border-[#c9a55c] bg-[#fffaf0] px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[13px] text-muted">
                  Motif du virement, à recopier tel quel
                </p>
                <p className="m-0 mt-0.5 font-[family-name:var(--font-mono)] text-[20px] font-bold tracking-[0.04em] text-[#16355c]">
                  {p.reference}
                </p>
                <p className="m-0 mt-0.5 text-[12.5px] text-muted">
                  C’est lui qui permet à l’équipe de retrouver votre règlement.
                </p>
              </div>
              <BoutonCopier
                valeur={p.reference}
                libelle="le motif du virement"
                className="border-[#16355c] bg-white text-[#16355c] hover:bg-[#16355c] hover:text-white"
              />
            </div>

            <div className="mt-6">
              <AnnonceAdaptative
                reglementId={p.reglementId}
                libelle="Référence de l’opération"
                aide="après le virement"
                exemple="Donnée par votre banque après le virement"
                plusTard="Je ferai le virement plus tard"
                fait="J’ai fait le virement · prévenir l’équipe"
                champ="rounded-[10px]"
              />
            </div>
          </>
        ) : (
          <Confirmation {...p} somme={somme} />
        )}
      </div>
    </div>
  );
}

function Onglets({ etape }: { etape: 1 | 2 | 3 }) {
  return (
    <ol className="m-0 grid list-none grid-cols-3 p-0">
      {["Montant", "Coordonnées", "Confirmation"].map((libelle, i) => {
        const n = i + 1;
        const atteinte = n <= etape;
        return (
          <li
            key={libelle}
            aria-current={n === etape ? "step" : undefined}
            className={`border-b-[3px] pb-2.5 text-center text-[14px] ${
              atteinte ? "border-[#16355c]" : "border-[#d5dce5]"
            } ${n === etape ? "font-bold text-ink" : "text-muted"}`}
          >
            {libelle}
          </li>
        );
      })}
    </ol>
  );
}

function decouperRib(rib: string) {
  const c = rib.replace(/\D/g, "");
  if (c.length !== 23) return null;
  return {
    banque: c.slice(0, 5),
    guichet: c.slice(5, 10),
    compte: c.slice(10, 21),
    cle: c.slice(21),
  };
}

function CarteRib({ coordonnees: c }: PropsReglement) {
  const cases = decouperRib(c.rib);
  const ribComplet = cases
    ? `${cases.banque} ${cases.guichet} ${cases.compte} ${cases.cle}`
    : c.rib;

  return (
    <section
      aria-label="Relevé d’identité bancaire de la chambre"
      className="relative mt-5 overflow-hidden rounded-[18px] border border-[#dbe2ea] bg-white p-5 shadow-[0_18px_40px_-28px_rgba(22,53,92,0.55)] sm:p-6"
    >
      <Guilloche />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="m-0 text-[16px] font-bold text-[#16355c]">{c.banque}</p>
          {c.agence ? (
            <p className="m-0 text-[13px] text-muted">{c.agence}</p>
          ) : null}
        </div>
        <span className="rounded-[5px] border border-[#b08a3e] px-2 py-0.5 text-[11px] font-bold tracking-[0.14em] text-[#7d5f22]">
          RIB
        </span>
      </div>

      <p className="relative m-0 mt-4 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">
        Titulaire du compte
      </p>
      <p className="relative m-0 text-[19px] font-bold text-[#16355c]">
        {c.titulaire}
      </p>

      {cases ? (
        <dl className="relative m-0 mt-3 grid grid-cols-[1fr_1fr_2.2fr_auto] overflow-hidden rounded-[8px] border border-[#16355c] bg-white/45">
          {(
            [
              ["Banque", cases.banque],
              ["Guichet", cases.guichet],
              ["N° de compte", cases.compte],
              ["Clé", cases.cle],
            ] as const
          ).map(([libelle, valeur], i) => (
            <div
              key={libelle}
              className={`min-w-0 px-2 py-2 sm:px-3 ${i > 0 ? "border-l border-[#16355c]" : ""}`}
            >
              <dt className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
                {libelle}
              </dt>
              <dd className="m-0 mt-0.5 font-[family-name:var(--font-mono)] text-[13px] font-bold text-ink sm:text-[15px]">
                {valeur}
              </dd>
            </div>
          ))}
        </dl>
      ) : c.rib ? (
        <p className="relative m-0 mt-3 font-[family-name:var(--font-mono)] text-[15px] font-bold text-ink">
          {c.rib}
        </p>
      ) : null}

      {c.iban || c.bic ? (
        <p className="relative m-0 mt-2.5 font-[family-name:var(--font-mono)] text-[13px] tracking-[0.04em] text-muted [overflow-wrap:anywhere]">
          {c.iban ? <span className="block">IBAN {c.iban}</span> : null}
          {c.bic ? <span className="block">BIC {c.bic}</span> : null}
        </p>
      ) : null}

      <div className="relative mt-4 flex justify-end">
        <BoutonCopier
          valeur={ribComplet || c.iban}
          libelle="le RIB de la chambre"
          texte="Copier le RIB"
          className="border-[#16355c] bg-white text-[#16355c] hover:bg-[#16355c] hover:text-white"
        />
      </div>
    </section>
  );
}

function Guilloche() {
  const ondes: string[] = [];
  for (let i = 0; i < 7; i++) {
    for (const sens of [1, -1]) {
      let d = `M0 ${80 + i * 3}`;
      for (let x = 10; x <= 600; x += 10) {
        const y =
          80 + i * 3 + sens * (18 + i * 2.5) * Math.sin(x / 42 + i * 0.5);
        d += ` L${x} ${y.toFixed(1)}`;
      }
      ondes.push(d);
    }
  }
  return (
    <svg
      aria-hidden
      viewBox="0 0 600 160"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 top-[22%] h-[55%] w-full"
    >
      <g fill="none" stroke="#b9c6d5" strokeWidth="0.9" opacity="0.85">
        {ondes.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
}

function Confirmation({
  statut,
  reference,
  somme,
}: PropsReglement & { somme: string }) {
  const recu = statut === "reussie";
  return (
    <div className="pt-8 text-center">
      <CheckCircle2
        size={48}
        aria-hidden
        className={`mx-auto ${recu ? "text-success" : "text-[#16355c]"}`}
      />
      <h2 className="m-0 mt-4 text-[24px] font-bold text-ink">
        {recu ? "Virement reçu" : "Merci — c’est noté"}
      </h2>
      <p className="m-0 mx-auto mt-2 max-w-[440px] text-[15px] leading-relaxed text-muted">
        {recu
          ? `L’équipe a constaté l’arrivée de ${somme}. Il n’y a plus rien à faire.`
          : `L’équipe confirmera votre virement de ${somme} dès qu’il apparaîtra sur le compte de la chambre. Vous le verrez dans votre espace.`}
      </p>
      <div className="mx-auto mt-5 max-w-[400px] text-left">
        <Copiable libelle="Motif du virement" valeur={reference} accent />
      </div>
      <Link
        href="/membre/cotisations"
        className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-[10px] bg-[var(--pf-bouton)] px-6 text-[15px] font-bold text-white no-underline transition-colors duration-200 hover:bg-[var(--pf-bouton-survol)]"
      >
        Revenir aux factures <ArrowRight size={17} />
      </Link>
    </div>
  );
}
