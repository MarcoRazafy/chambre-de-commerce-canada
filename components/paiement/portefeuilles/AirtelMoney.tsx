import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, ChevronLeft } from "lucide-react";
import { Copiable } from "@/components/paiement/Copiable";
import {
  couleurs,
  etapeDu,
  ETAPES,
  LOGOS,
  MentionSecret,
  type Etape,
  PaiementDirect,
  type PropsTunnel,
} from "@/components/paiement/portefeuilles/commun";
import { fmtMontant } from "@/lib/membership";

export function TunnelAirtelMoney(p: PropsTunnel) {
  const etape = etapeDu(p);
  const somme = fmtMontant(p.montant, p.devise);

  return (
    <div style={couleurs(p.mode)} className="mx-auto max-w-[620px]">
      <section className="relative overflow-hidden rounded-[28px] bg-[#e0141c] px-6 pb-14 pt-6 text-white sm:px-8">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-28 -left-16 h-60 w-60 rounded-full bg-[#ffd200]/10"
        />

        <div className="relative flex items-center justify-between gap-4">
          <Link
            href={p.retour}
            aria-label="Choisir un autre moyen de paiement"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white no-underline transition-colors hover:bg-white/25"
          >
            <ChevronLeft size={20} />
          </Link>
          <span className="flex h-11 items-center rounded-full bg-white px-4">
            <Image
              src={LOGOS.airtel_money.src}
              alt="Airtel Money"
              width={LOGOS.airtel_money.largeur}
              height={LOGOS.airtel_money.hauteur}
              className="h-7 w-auto object-contain"
            />
          </span>
        </div>

        <p className="relative m-0 mt-7 text-[14px] font-semibold">
          Règlement
        </p>
        <p className="relative m-0 mt-1 text-[44px] font-extrabold leading-none tracking-[-0.02em] tabular-nums">
          {p.montant.toLocaleString("fr-FR")}{" "}
          <span className="text-[24px] text-[#ffd200]">
            {p.devise === "CAD" ? "$" : "Ar"}
          </span>
        </p>
        <p className="relative m-0 mt-2 truncate text-[15px]">{p.objet}</p>

        <Progression etape={etape} />
      </section>

      <section className="relative -mt-8 rounded-[28px] border border-line bg-surface p-6 shadow-[0_24px_60px_-30px_rgba(60,10,10,0.45)] sm:p-8">
        {etape === 1 ? (
          <>
            <h1 className="m-0 text-[24px] font-bold leading-tight tracking-[-0.01em]">
              Votre règlement par Airtel Money
            </h1>

            <Ticket
              lignes={[
                ["Pour", p.objet],
                ["Vers", p.titulaire || "La Chambre"],
              ]}
              pied={["Montant", somme]}
            />

            <PaiementDirect p={p} className="mt-6" />
            <div className="mt-5 text-center">
              <Link
                href={p.plusTard}
                className="text-[14px] font-semibold text-muted underline-offset-4 hover:text-ink hover:underline"
              >
                Payer plus tard
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#ffd200] text-[#101418]">
              <Check size={30} strokeWidth={2.5} aria-hidden />
            </span>
            <h1 className="m-0 mt-5 text-[24px] font-bold leading-tight">
              {p.statut === "reussie"
                ? "Règlement encaissé"
                : "Merci — c’est noté"}
            </h1>
            <p className="m-0 mx-auto mt-2 max-w-[420px] text-[15px] leading-relaxed text-muted">
              {p.statut === "reussie"
                ? `L’équipe a constaté l’arrivée de ${somme}. Il n’y a plus rien à faire.`
                : `Vous avez annoncé un règlement de ${somme}. L’équipe le confirmera dès qu’elle aura constaté l’arrivée de l’argent.`}
            </p>
            <div className="mx-auto mt-5 max-w-[400px] text-left">
              <Copiable
                libelle="Référence du règlement"
                valeur={p.reference}
                accent
              />
            </div>
            <Link
              href="/membre/cotisations"
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--pf-bouton)] px-6 text-[15px] font-bold text-[var(--pf-sur-bouton)] no-underline transition-colors hover:bg-[var(--pf-bouton-survol)] sm:w-auto"
            >
              Revenir aux factures <ArrowRight size={17} />
            </Link>
          </div>
        )}
      </section>

      <MentionSecret
        mode={p.mode}
        className="mt-5 justify-center text-center text-muted"
      />
    </div>
  );
}

function Progression({ etape }: { etape: Etape }) {
  return (
    <div className="relative mt-7">
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={3}
        aria-valuenow={etape}
        aria-label={`Étape ${etape} sur 3`}
        className="flex gap-1.5"
      >
        {ETAPES.map((e, i) => (
          <span
            key={e}
            className={`h-1.5 flex-1 rounded-full ${
              i < etape ? "bg-[#ffd200]" : "bg-white/30"
            }`}
          />
        ))}
      </div>
      <ol className="m-0 mt-2.5 flex list-none justify-between p-0 text-[13px]">
        {ETAPES.map((e, i) => (
          <li
            key={e}
            aria-current={i + 1 === etape ? "step" : undefined}
            className={
              i + 1 === etape ? "font-bold text-white" : "text-white/85"
            }
          >
            {e}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Ticket({
  lignes,
  pied,
}: {
  lignes: [string, string][];
  pied: [string, string];
}) {
  return (
    <dl className="relative m-0 mt-6 rounded-[20px] bg-[#fff4f4] px-5 py-4 text-[14px]">
      {lignes.map(([libelle, valeur]) => (
        <div key={libelle} className="flex justify-between gap-4 py-1">
          <dt className="text-muted">{libelle}</dt>
          <dd className="m-0 min-w-0 truncate text-right font-semibold text-ink">
            {valeur}
          </dd>
        </div>
      ))}
      <div
        aria-hidden
        className="relative my-3 border-t-2 border-dashed border-[#f3c3c5]"
      >
        <span className="absolute -left-8 -top-3 h-6 w-6 rounded-full bg-surface" />
        <span className="absolute -right-8 -top-3 h-6 w-6 rounded-full bg-surface" />
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-muted">{pied[0]}</dt>
        <dd className="m-0 text-[20px] font-extrabold text-[#b30d14] tabular-nums">
          {pied[1]}
        </dd>
      </div>
    </dl>
  );
}
