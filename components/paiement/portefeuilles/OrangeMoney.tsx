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

export function TunnelOrangeMoney(p: PropsTunnel) {
  const etape = etapeDu(p);
  const somme = fmtMontant(p.montant, p.devise);

  return (
    <div
      style={couleurs(p.mode)}
      className="overflow-hidden bg-black font-['Helvetica_Neue',Helvetica,Arial,sans-serif]"
    >
      <header className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-3.5 text-white sm:px-8">
        <Link
          href={p.retour}
          aria-label="Choisir un autre moyen de paiement"
          className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/50 text-white no-underline transition-colors hover:bg-white hover:text-black"
        >
          <ChevronLeft size={20} />
        </Link>
        <Image
          src={LOGOS.orange_money.src}
          alt="Orange Money"
          width={LOGOS.orange_money.largeur}
          height={LOGOS.orange_money.hauteur}
          className="h-10 w-auto shrink-0 object-contain"
        />
        <p className="m-0 min-w-0 flex-1 text-[15px]">
          <b>Paiement Orange Money</b>
          <span className="text-white/75"> · Règlement CanCham</span>
        </p>
        <Image
          src="/marque/logo-blanc.png"
          alt="IMPACT 261"
          width={1600}
          height={647}
          className="hidden h-10 w-auto shrink-0 object-contain sm:block"
        />
      </header>

      <div className="bg-white px-5 pb-10 pt-9 text-black sm:px-10">
        <div className="mx-auto max-w-[860px]">
          <h1 className="m-0 text-[28px] font-bold leading-tight tracking-[-0.01em] sm:text-[32px]">
            Régler par Orange Money
          </h1>
          <Chevrons etape={etape} />
        </div>

        <div className="mx-auto mt-10 max-w-[480px]">
          {etape === 1 ? (
            <>
              <p className="m-0 mb-1.5 text-[14px] font-bold">
                Montant à régler
              </p>
              <div className="flex border border-[#b3b3b3]">
                <output className="flex-1 px-4 py-3 text-[24px] font-bold tabular-nums">
                  {p.montant.toLocaleString("fr-FR")}
                </output>
                <span className="flex items-center border-l border-[#b3b3b3] bg-[#f4f4f4] px-4 text-[16px] font-bold">
                  {p.devise === "CAD" ? "$" : "Ar"}
                </span>
              </div>

              <dl className="m-0 mt-6 bg-[#f4f4f4] px-4 py-3.5 text-[14px]">
                <div className="flex justify-between gap-4 py-1">
                  <dt className="text-[#595959]">Pour</dt>
                  <dd className="m-0 min-w-0 truncate text-right font-bold">
                    {p.objet}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 py-1">
                  <dt className="text-[#595959]">Bénéficiaire</dt>
                  <dd className="m-0 font-bold">
                    {p.titulaire || "CanCham Madagascar"}
                  </dd>
                </div>
              </dl>

              <PaiementDirect p={p} className="mt-6 rounded-none" />
              <div className="mt-6">
                <Link
                  href={p.plusTard}
                  className="text-[15px] text-black underline underline-offset-4 hover:text-[#595959]"
                >
                  Payer plus tard
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="m-0 text-[22px] font-bold leading-snug">
                {p.statut === "reussie"
                  ? "Règlement encaissé"
                  : "Merci — c’est noté"}
              </h2>
              <p className="m-0 mt-2 text-[15px] leading-relaxed text-[#595959]">
                {p.statut === "reussie"
                  ? `L’équipe a constaté l’arrivée de ${somme}. Il n’y a plus rien à faire.`
                  : `Vous avez annoncé un règlement de ${somme}. L’équipe le confirmera dès qu’elle aura constaté l’arrivée de l’argent.`}
              </p>
              <div className="mt-5">
                <Copiable
                  libelle="Référence du règlement"
                  valeur={p.reference}
                  accent
                />
              </div>
              <Link
                href="/membre/cotisations"
                className="mt-6 inline-flex min-h-12 items-center gap-2 bg-[var(--pf-bouton)] px-6 text-[15px] font-bold text-[var(--pf-sur-bouton)] no-underline transition-colors hover:bg-[var(--pf-bouton-survol)]"
              >
                Revenir aux factures <ArrowRight size={17} />
              </Link>
            </>
          )}
        </div>

        <MentionSecret
          mode={p.mode}
          className="mx-auto mt-14 max-w-[480px] justify-center text-center text-[#595959]"
        />
      </div>
    </div>
  );
}

function Chevrons({ etape }: { etape: Etape }) {
  return (
    <ol className="m-0 mt-6 flex list-none gap-1 p-0">
      {ETAPES.map((libelle, i) => {
        const n = i + 1;
        const faite = n < etape;
        const courante = n === etape;
        return (
          <li
            key={libelle}
            aria-current={courante ? "step" : undefined}
            className={`flex min-h-11 flex-1 items-center justify-center gap-1 whitespace-nowrap px-3 text-center text-[13px] font-bold sm:gap-1.5 sm:px-5 sm:text-[14px] ${
              i === 0
                ? "[clip-path:polygon(0_0,calc(100%-14px)_0,100%_50%,calc(100%-14px)_100%,0_100%)]"
                : "[clip-path:polygon(0_0,calc(100%-14px)_0,100%_50%,calc(100%-14px)_100%,0_100%,14px_50%)]"
            } ${
              courante
                ? "bg-[var(--pf-bouton)] text-black"
                : faite
                  ? "bg-black text-white"
                  : "bg-[#e6e6e6] text-[#333]"
            }`}
          >
            {faite ? <Check size={15} aria-hidden /> : null}
            {n}. {libelle}
          </li>
        );
      })}
    </ol>
  );
}
