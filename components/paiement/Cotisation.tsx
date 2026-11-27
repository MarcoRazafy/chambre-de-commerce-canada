import Link from "next/link";
import { Clock, CreditCard, Lock } from "lucide-react";
import { FenetreMoyens } from "@/components/paiement/FenetreMoyens";
import { GrilleMoyens } from "@/components/paiement/GrilleMoyens";
import { Banner, BtnLink } from "@/components/ui";
import { reglerCotisation } from "@/lib/actions/reglements";
import type { CotisationDue } from "@/lib/cotisation";
import { RETARD_BLOCAGE_JOURS } from "@/lib/membership";
import type { ModeReglement } from "@/lib/modes-reglement";

export type SituationCotisation = "attente" | "retard" | "bloque";

const HORS_LIGNE =
  "Elle se règle auprès de l’équipe de la Chambre, par virement ou en espèces : votre accès s’ouvre à réception.";

export function BandeauCotisation({
  cotisation,
  modes,
  situation,
  jours,
  blocage = RETARD_BLOCAGE_JOURS,
}: {
  cotisation: CotisationDue;
  modes: ModeReglement[];
  situation: SituationCotisation;
  jours: number;
  blocage?: number;
}) {
  const { somme, formule } = cotisation;
  const payable = cotisation.enLigne && modes.length > 0 && somme !== null;

  const titre =
    somme === null
      ? "Cotisation à régler"
      : situation === "bloque"
        ? `Accès restreint : cotisation de ${somme} à régler`
        : situation === "retard"
          ? `Cotisation en retard : ${somme}`
          : `Cotisation à régler : ${somme}`;

  const texte =
    somme === null
      ? "Votre formule reste à choisir : écrivez à l’équipe, elle vous indique le montant de votre cotisation."
      : situation === "bloque"
        ? `Votre cotisation a ${jours} jours de retard. Réglez-la pour rouvrir toutes les sections de votre espace.`
        : situation === "retard"
          ? `Régularisez avant ${blocage} jours de retard : ${jours} sur ${blocage} sont écoulés.`
          : `Votre adhésion est validée. Réglez votre cotisation annuelle${formule ? ` (${formule})` : ""} pour ouvrir l’annuaire, les événements, la messagerie et le reste de votre espace.`;

  return (
    <Banner
      tone={situation === "attente" ? "warn" : "bad"}
      icon={situation === "bloque" ? <Lock size={18} /> : <Clock size={18} />}
      title={titre}
      action={
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {payable ? (
            <FenetreMoyens
              cotisation={{ formule, somme }}
              modes={modes}
              declencheur={
                <>
                  <CreditCard size={15} /> Régler maintenant
                </>
              }
              classeDeclencheur="btn-action btn-action-sm"
            />
          ) : null}
          <BtnLink href="/membre/contact" sm>
            {payable
              ? "Payer autrement : écrire à l’équipe"
              : "Écrire à l’équipe"}
          </BtnLink>
        </div>
      }
    >
      {texte}
      {!payable && somme !== null ? ` ${HORS_LIGNE}` : ""}
    </Banner>
  );
}

export function BlocCotisation({
  cotisation,
  modes,
}: {
  cotisation: CotisationDue;
  modes: ModeReglement[];
}) {
  const { somme } = cotisation;
  const payable = cotisation.enLigne && modes.length > 0 && somme !== null;

  return (
    <div id="regler" className="mt-6 border-t border-line pt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 className="m-0 text-[16.5px]">Régler ma cotisation</h3>
        {somme ? (
          <span className="font-[family-name:var(--font-mono)] text-[22px] font-bold tabular-nums text-ink">
            {somme}
          </span>
        ) : null}
      </div>

      {payable ? (
        <>
          <p className="m-0 mt-1 text-[13.5px] text-muted">
            Choisissez votre moyen de paiement : votre espace s’ouvre dès le
            paiement confirmé.
          </p>
          <form action={reglerCotisation} className="mt-4">
            <GrilleMoyens
              modes={modes}
              colonnes="grid-cols-2 2xl:grid-cols-4"
            />
          </form>
          <p className="m-0 mt-3 text-[12.5px] text-muted">
            Les frais de l’opérateur ou de change s’ajoutent au montant. Par
            virement ou en espèces,{" "}
            <Link href="/membre/contact" className="font-semibold text-accent">
              écrivez à l’équipe
            </Link>{" "}
            : elle active votre accès à réception.
          </p>
        </>
      ) : (
        <>
          <p className="m-0 mt-1 text-[13.5px] text-muted">
            {somme === null
              ? "Votre formule reste à choisir : l’équipe vous indique le montant de votre cotisation."
              : HORS_LIGNE}
          </p>
          <div className="mt-4">
            <BtnLink href="/membre/contact" variant="primary" sm>
              Écrire à l’équipe
            </BtnLink>
          </div>
        </>
      )}
    </div>
  );
}
