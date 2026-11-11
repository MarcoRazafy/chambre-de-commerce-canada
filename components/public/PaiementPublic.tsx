import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock } from "lucide-react";
import { INPUT } from "@/components/champ-style";
import { SubmitButton } from "@/components/form-bits";
import { Copiable } from "@/components/paiement/Copiable";
import { VisuelMode } from "@/components/paiement/IconeMode";
import {
  annoncerPaiementPublic,
  choisirPaiementPublic,
} from "@/lib/actions/paiements";
import { fmtMoney } from "@/lib/format";
import {
  estPortefeuille,
  MODES,
  numeroPortefeuille,
  ORDRE_MODES,
  type Coordonnees,
  type ModeReglement,
} from "@/lib/modes-reglement";

export function PaiementPublic({
  eventId,
  code,
  montant,
  modes,
  reglement,
  ecarte = null,
  coordonnees,
  marchand,
  page,
}: {
  eventId: string;
  code: string;
  montant: number;
  modes: ModeReglement[];
  reglement: {
    mode: ModeReglement;
    reference: string;
    statut: string;
  } | null;
  ecarte?: string | null;
  coordonnees: Coordonnees;
  marchand: string | null;
  page: string;
}) {
  const cles = (
    <>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="code" value={code} />
    </>
  );

  if (!reglement) {
    return (
      <section className="vitrine-claire mt-4 rounded-xl border border-line p-4 sm:p-5">
        <h2 className="m-0 text-[17px] font-semibold text-ink">
          Comment payerez-vous ?
        </h2>
        <p className="m-0 mt-1 text-[13.5px] text-muted">
          <b className="text-ink">{fmtMoney(montant)}</b> à régler. Vos QR codes
          partent par e-mail dès le règlement confirmé.
        </p>
        {ecarte ? (
          <p
            role="alert"
            className="m-0 mt-3 rounded-[var(--radius-s)] bg-warn-soft px-3.5 py-3 text-[13.5px] text-warn"
          >
            <b>L’équipe n’a pas retrouvé votre paiement</b> (réf. {ecarte}).
            Choisissez à nouveau un moyen, ou écrivez-lui si vous avez bien
            payé.
          </p>
        ) : null}
        {modes.length ? (
          <form action={choisirPaiementPublic} className="mt-4">
            {cles}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
              {ORDRE_MODES.filter((m) => modes.includes(m)).map((m) => (
                <SubmitButton
                  key={m}
                  name="mode"
                  value={m}
                  variant="line"
                  pendingLabel="Ouverture…"
                  className="h-full min-h-[104px] w-full min-w-0 flex-col items-center justify-center gap-2 px-3 py-3.5 text-center whitespace-normal!"
                >
                  <VisuelMode mode={m} />
                  <span className="text-[14px] font-semibold text-ink">
                    {MODES[m].titre}
                  </span>
                </SubmitButton>
              ))}
            </div>
            {marchand && modes.includes("carte") ? (
              <p className="m-0 mt-3 text-[12.5px] text-muted">
                Par carte, la page de paiement affiche le marchand{" "}
                <b className="text-ink">{marchand}</b> : il encaisse pour le
                compte de la CanCham.
              </p>
            ) : null}
          </form>
        ) : (
          <p className="m-0 mt-3 text-[13.5px] text-muted">
            Le règlement se fait auprès de l’équipe CanCham, avant l’événement.
          </p>
        )}
      </section>
    );
  }

  const { mode, reference, statut } = reglement;
  const c = coordonnees;
  const annonce = statut === "annonce";

  return (
    <section className="vitrine-claire mt-4 rounded-xl border border-line p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <VisuelMode mode={mode} />
          <div className="min-w-0">
            <h2 className="m-0 text-[17px] font-semibold text-ink">
              {MODES[mode].titre}
            </h2>
            <p className="m-0 text-[13.5px] text-muted">
              <b className="text-ink">{fmtMoney(montant)}</b> à régler
            </p>
          </div>
        </div>
        {annonce ? null : (
          <Link
            href={`${page}&moyen=choix`}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted no-underline hover:text-accent"
          >
            <ArrowLeft size={14} /> Changer de moyen
          </Link>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {estPortefeuille(mode) ? (
          <>
            <p className="m-0 text-[13.5px] text-muted">
              Depuis votre téléphone, envoyez le montant au numéro de la
              chambre, en rappelant la référence en motif.
            </p>
            <Copiable
              libelle={`Numéro ${MODES[mode].titre}`}
              valeur={numeroPortefeuille(mode, c)}
            />
            {c.titulaire ? (
              <Ligne libelle="Au nom de" valeur={c.titulaire} />
            ) : null}
          </>
        ) : mode === "virement" ? (
          <>
            <p className="m-0 text-[13.5px] text-muted">
              Depuis votre banque, faites un virement vers le compte de la
              chambre, en rappelant la référence en motif.
            </p>
            {c.titulaire ? (
              <Ligne libelle="Titulaire" valeur={c.titulaire} />
            ) : null}
            {c.banque ? (
              <Ligne
                libelle="Banque"
                valeur={[c.banque, c.agence].filter(Boolean).join(" · ")}
              />
            ) : null}
            {c.rib ? <Copiable libelle="RIB" valeur={c.rib} /> : null}
            {c.iban ? <Copiable libelle="IBAN" valeur={c.iban} /> : null}
            {c.bic ? <Copiable libelle="BIC" valeur={c.bic} /> : null}
          </>
        ) : mode === "depot" ? (
          <>
            <p className="m-0 text-[13.5px] text-muted">
              Déposez le montant en espèces au guichet de la banque, sur le
              compte de la chambre, en rappelant la référence sur le bordereau.
            </p>
            <Ligne
              libelle="Banque"
              valeur={[c.banque, c.agence].filter(Boolean).join(" · ")}
            />
            {c.titulaire ? (
              <Ligne libelle="Titulaire" valeur={c.titulaire} />
            ) : null}
            <Copiable libelle="RIB" valeur={c.rib} />
          </>
        ) : mode === "especes" ? (
          <>
            <p className="m-0 text-[13.5px] text-muted">
              Remettez le montant en main propre à l’équipe, contre reçu, en
              donnant la référence.
            </p>
            <Ligne libelle="Bureau de la chambre" valeur={c.adresseBureau} />
            {c.horaires ? (
              <Ligne libelle="Horaires" valeur={c.horaires} />
            ) : null}
          </>
        ) : (
          <>
            <p className="m-0 text-[13.5px] text-muted">
              Réglez par l’une des plateformes ci-dessous, en rappelant la
              référence.
            </p>
            <Ligne libelle="Plateformes acceptées" valeur={c.plateformes} />
          </>
        )}
        <Copiable libelle="Référence à rappeler" valeur={reference} accent />
      </div>

      {annonce ? (
        <p className="m-0 mt-4 flex items-start gap-2 rounded-[var(--radius-s)] bg-surface-2 px-3.5 py-3 text-[13.5px] text-muted">
          <Clock size={16} className="mt-0.5 shrink-0 text-warn" />
          <span>
            <b className="text-ink">
              {mode === "especes" ? "Venue annoncée." : "Paiement annoncé."}
            </b>{" "}
            {mode === "especes"
              ? "L’équipe confirme à la remise des espèces"
              : "L’équipe confirme dès qu’elle a constaté l’arrivée de l’argent"}{" "}
            : vos QR codes partent alors par e-mail, et s’affichent sur cette
            page.
          </span>
        </p>
      ) : (
        <form action={annoncerPaiementPublic} className="mt-4">
          {cles}
          {mode === "especes" ? null : (
            <label className="block">
              <span className="block text-[12.3px] font-semibold text-muted mb-1.5">
                Référence de votre transaction (facultatif)
              </span>
              <input
                name="refBancaire"
                maxLength={80}
                placeholder="Celle que votre banque ou votre opérateur vous donne"
                className={INPUT}
              />
            </label>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <SubmitButton pendingLabel="Envoi…">
              <CheckCircle2 size={15} />{" "}
              {mode === "especes"
                ? "Prévenir l’équipe de ma venue"
                : "J’ai payé : prévenir l’équipe"}
            </SubmitButton>
            <span className="text-[12.5px] text-muted">
              Annoncer n’est pas payer : l’inscription est confirmée quand
              l’équipe constate le règlement.
            </span>
          </div>
        </form>
      )}
    </section>
  );
}

function Ligne({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div className="rounded-[var(--radius-m)] border border-line bg-surface-2 px-4 py-3">
      <div className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-faint">
        {libelle}
      </div>
      <div className="mt-0.5 whitespace-pre-line break-words text-[14.5px] font-semibold text-ink">
        {valeur}
      </div>
    </div>
  );
}
