import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Lock,
} from "lucide-react";
import { BoutonMarque } from "@/components/paiement/BoutonMarque";
import { payerParCarte } from "@/lib/actions/paiements";
import { fmtMontant, type Devise } from "@/lib/membership";

const NUIT = "#1e2d6b";

export function TunnelCarte({
  reglementId,
  montant,
  devise,
  objet,
  titulaire,
  statut,
  raccorde,
  marchand,
  retour,
}: {
  reglementId: string;
  montant: number;
  devise: Devise;
  objet: string;
  titulaire: string;
  statut: string;
  raccorde: boolean;
  marchand: string | null;
  retour: string;
}) {
  const somme = fmtMontant(montant, devise);
  const encaisse = statut === "reussie";

  return (
    <div
      style={
        {
          "--pf-bouton": NUIT,
          "--pf-sur-bouton": "#ffffff",
          "--pf-bouton-survol": "#15204f",
        } as CSSProperties
      }
      className="rounded-[var(--radius-l)] bg-[linear-gradient(180deg,#eef1f7,#e4e8f1)] px-4 py-8 sm:py-12"
    >
      <section className="mx-auto max-w-[560px] overflow-hidden rounded-[20px] bg-white shadow-[0_30px_60px_-32px_rgba(20,30,70,0.5)]">
        <header className="bg-[#1e2d6b] px-6 pb-6 pt-4 text-white sm:px-8">
          <Link
            href={retour}
            className="-ml-1 inline-flex min-h-11 items-center gap-2 px-1 text-[15px] font-semibold text-[#9cc3ff] no-underline transition-colors duration-200 hover:text-white"
          >
            <ArrowLeft size={17} aria-hidden /> Retour
          </Link>
          <p className="m-0 mt-2 text-[12.5px] font-semibold uppercase tracking-[0.1em] text-white/75">
            Paiement pour
          </p>
          <p className="m-0 mt-0.5 text-[26px] font-bold leading-tight">
            La Chambre
          </p>
          <p className="m-0 mt-1 text-[38px] font-extrabold leading-tight tracking-[-0.02em] tabular-nums">
            {somme}
          </p>
          <p className="m-0 mt-1 text-[15px] text-white/85">{objet}</p>
        </header>

        {encaisse ? (
          <div className="px-6 py-10 text-center sm:px-8">
            <CheckCircle2
              size={46}
              aria-hidden
              className="mx-auto text-success"
            />
            <h1 className="m-0 mt-4 text-[22px] font-bold text-ink">
              Paiement accepté
            </h1>
            <p className="m-0 mt-2 text-[15px] leading-relaxed text-muted">
              Le prestataire a confirmé votre paiement de {somme}. Il n’y a plus
              rien à faire.
            </p>
            <Link
              href="/membre/cotisations"
              className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-[10px] bg-[#1e2d6b] px-6 text-[15px] font-bold text-white no-underline hover:bg-[#15204f]"
            >
              Revenir aux factures <ArrowRight size={17} />
            </Link>
          </div>
        ) : (
          <form action={payerParCarte} className="px-6 py-6 sm:px-8">
            <input type="hidden" name="reglementId" value={reglementId} />
            <div className="flex items-center justify-between gap-4">
              <h1 className="m-0 text-[18px] font-bold leading-snug text-[#1e2d6b]">
                Paiement sécurisé par carte
              </h1>
              <Image
                src="/paiement/carte.jpeg"
                alt="CB, Mastercard et Visa"
                width={738}
                height={363}
                className="h-8 w-auto shrink-0 object-contain"
              />
            </div>

            <div className="mt-4 flex gap-3 rounded-[10px] border border-[#d8def0] bg-[#f3f5fb] px-4 py-3.5">
              <CreditCard
                size={20}
                aria-hidden
                className="mt-0.5 shrink-0 text-[#1e2d6b]"
              />
              <p className="m-0 text-[14px] leading-snug text-[#33415f]">
                <b className="text-[#1e2d6b]">
                  Numéro de carte, expiration et code de sécurité
                </b>{" "}
                se saisissent à l’étape suivante, sur la page sécurisée de
                Vanilla Pay. La Chambre ne les voit jamais.
              </p>
            </div>

            <div className="mt-5">
              <label
                htmlFor="titulaire-carte"
                className="mb-1.5 block text-[15px] font-semibold text-ink"
              >
                Nom du titulaire
              </label>
              <input
                id="titulaire-carte"
                name="titulaire"
                required
                maxLength={80}
                autoComplete="cc-name"
                defaultValue={titulaire}
                placeholder="Nom figurant sur la carte"
                className="min-h-12 w-full rounded-[10px] border border-[#cfd6e4] bg-surface px-4 text-[16px] text-ink placeholder:text-faint focus:border-[#1e2d6b] focus:outline-none"
              />
            </div>

            <div className="mt-6 flex items-baseline justify-between gap-4 border-t border-line pt-5">
              <span className="text-[17px] font-bold text-[#1e2d6b]">
                Total à payer
              </span>
              <span className="text-[24px] font-extrabold text-ink tabular-nums">
                {somme}
              </span>
            </div>

            <BoutonMarque
              enCours="Redirection…"
              className="mt-5 min-h-[54px] w-full rounded-[10px] text-[17px]"
            >
              Payer {somme}
            </BoutonMarque>
            <p className="m-0 mt-4 flex items-center justify-center gap-2 text-[14px] text-muted">
              <Lock size={15} aria-hidden className="text-[#b8860b]" />
              Paiement sécurisé
            </p>
            {raccorde ? (
              marchand ? (
                <p className="m-0 mt-3 rounded-[10px] bg-surface-2 px-4 py-3 text-[13px] leading-snug text-muted">
                  Sur la page de paiement, le marchand affiché est{" "}
                  <b className="text-ink">{marchand}</b> : il encaisse pour le
                  compte de la Chambre. C’est aussi ce nom qui figurera sur
                  votre relevé.
                </p>
              ) : null
            ) : (
              <p className="m-0 mt-2 text-center text-[12.5px] leading-snug text-muted">
                Le raccordement au prestataire est en cours de mise en place.
              </p>
            )}
          </form>
        )}
      </section>
      <p className="m-0 mt-4 text-center text-[12.5px] text-muted">
        Paiement opéré par Vanilla Pay International
      </p>
    </div>
  );
}
