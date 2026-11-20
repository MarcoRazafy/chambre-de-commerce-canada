import { AlertTriangle, Banknote, Clock, MapPin } from "lucide-react";
import { Copiable } from "@/components/paiement/Copiable";
import { SubmitButton } from "@/components/form-bits";
import { Card } from "@/components/ui";
import { annoncerReglement } from "@/lib/actions/reglements";
import { fmtMontant, type Devise } from "@/lib/membership";
import {
  enLettres,
  estPortefeuille,
  MODES,
  numeroPortefeuille,
  type Coordonnees,
  type ModeReglement,
} from "@/lib/reglements";

export function TunnelReglement({
  mode,
  reference,
  montant,
  devise,
  coordonnees: c,
  objet,
  payeur,
}: {
  mode: ModeReglement;
  reference: string;
  montant: number;
  devise: Devise;
  coordonnees: Coordonnees;
  objet: string;
  payeur: string;
}) {
  const somme = fmtMontant(montant, devise);

  return (
    <div className="grid gap-4 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <Card className="p-6">
        <h2 className="m-0 text-[17px] font-semibold">
          {MODES[mode].titre} · {somme}
        </h2>
        <p className="m-0 mt-1.5 text-[13.4px] text-muted">{objet}</p>

        <div className="mt-5 grid gap-2.5">
          {mode === "virement" ? (
            <>
              <Copiable
                libelle="Titulaire du compte"
                valeur={c.titulaire}
                mono={false}
              />
              {c.rib ? <Copiable libelle="RIB" valeur={c.rib} /> : null}
              {c.iban ? <Copiable libelle="IBAN" valeur={c.iban} /> : null}
              {c.banque ? (
                <Copiable
                  libelle="Banque"
                  valeur={[c.banque, c.agence].filter(Boolean).join(" · ")}
                  mono={false}
                />
              ) : null}
            </>
          ) : null}

          {mode === "depot" ? (
            <>
              <Copiable libelle="Banque" valeur={c.banque} mono={false} />
              {c.agence ? (
                <Copiable libelle="Agence" valeur={c.agence} mono={false} />
              ) : null}
              <Copiable libelle="Compte à créditer" valeur={c.rib} />
              <Copiable libelle="Au nom de" valeur={c.titulaire} mono={false} />
              <Copiable
                libelle="Montant en lettres"
                valeur={`${enLettres(montant)} ariary`}
                mono={false}
              />
            </>
          ) : null}

          {mode === "especes" ? (
            <div className="rounded-[var(--radius-m)] border border-line bg-surface-2 px-4 py-3.5">
              <div className="flex items-start gap-2.5 text-[13.6px]">
                <MapPin size={15} className="mt-px shrink-0 text-accent" />
                <span className="whitespace-pre-line">{c.adresseBureau}</span>
              </div>
              {c.horaires ? (
                <div className="mt-2 flex items-start gap-2.5 text-[13.2px] text-muted">
                  <Clock size={15} className="mt-px shrink-0" />
                  <span>{c.horaires}</span>
                </div>
              ) : null}
            </div>
          ) : null}

          {mode === "paypal" ? (
            <>
              <Copiable libelle="Adresse PayPal de la chambre" valeur={c.paypal} />
              <a href="https://www.paypal.com/myaccount/transfer/homepage/pay" target="_blank" rel="noopener noreferrer" className="btn-contour btn-contour-sm w-fit text-ink no-underline hover:bg-surface-2">
                Ouvrir PayPal
              </a>
            </>
          ) : null}

          {mode === "plateforme" ? (
            <div className="rounded-[var(--radius-m)] border border-line bg-surface-2 px-4 py-3.5 text-[13.6px] whitespace-pre-line">
              {c.plateformes}
            </div>
          ) : null}

          {estPortefeuille(mode) ? (
            <>
              <Copiable
                libelle={`Numéro ${MODES[mode].titre}`}
                valeur={numeroPortefeuille(mode, c)}
              />
              {c.titulaire ? (
                <Copiable
                  libelle="Au nom de"
                  valeur={c.titulaire}
                  mono={false}
                />
              ) : null}
            </>
          ) : null}
        </div>

        <div className="mt-4">
          <Copiable
            libelle={
              mode === "especes"
                ? "Référence à donner à l’équipe"
                : mode === "paypal"
                  ? "Référence à mettre dans le message PayPal"
                  : estPortefeuille(mode)
                  ? "Référence à mettre en note du transfert"
                  : "Motif du virement, à recopier tel quel"
            }
            valeur={reference}
            accent
          />
          <p className="m-0 mt-2 text-[12.4px] text-muted">
            C’est elle qui permet à l’équipe de retrouver votre règlement.
            {payeur ? ` Il sera rattaché à ${payeur}.` : ""}
          </p>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2.5">
          <Banknote size={17} className="text-accent" />
          <h2 className="m-0 text-[15.5px] font-semibold">À régler</h2>
        </div>
        <div className="mt-3 font-[family-name:var(--font-mono)] text-[24px] font-bold text-ink">
          {somme}
        </div>
        <p className="m-0 mt-3 text-[12.8px] text-muted">
          Annoncer votre règlement ne le solde pas : la facture reste due
          jusqu’à ce que l’équipe constate l’arrivée de l’argent. Vous recevrez
          la confirmation dans votre espace.
        </p>
      </Card>
    </div>
  );
}

export function AnnonceReglement({
  reglementId,
  mode,
}: {
  reglementId: string;
  mode: ModeReglement;
}) {
  return (
    <Card className="mt-4 p-6">
      <h2 className="m-0 text-[15.5px] font-semibold">
        {mode === "especes"
          ? "Vous avez remis l’argent ?"
          : mode === "paypal"
            ? "Vous avez payé avec PayPal ?"
            : estPortefeuille(mode)
            ? "Vous avez envoyé l’argent ?"
            : "Vous avez fait le virement ?"}
      </h2>
      <p className="m-0 mt-1.5 text-[13.4px] text-muted">
        Prévenez l’équipe : elle confirmera dès réception. Si vous préférez le
        faire plus tard, revenez simplement sur cette page — votre référence est
        conservée.
      </p>

      <form
        action={annoncerReglement}
        className="mt-4 flex flex-wrap items-end gap-3"
      >
        <input type="hidden" name="reglementId" value={reglementId} />
        <label className="min-w-[240px] flex-1">
          <span className="mb-1.5 block text-[12.8px] font-semibold text-ink">
            Référence de l’opération{" "}
            <span className="font-normal text-faint">facultatif</span>
          </span>
          <input
            name="refBancaire"
            maxLength={60}
            placeholder={
              mode === "especes"
                ? "Nom de la personne qui remet"
                : mode === "paypal"
                  ? "Numéro de transaction PayPal"
                  : estPortefeuille(mode)
                  ? "Référence du SMS de confirmation"
                  : "Donnée par votre banque après le virement"
            }
            className="w-full rounded-[var(--radius-s)] border border-line bg-surface px-3 py-2 text-[13.4px] text-ink placeholder:text-faint"
          />
        </label>
        <SubmitButton pendingLabel="Envoi…">
          <AlertTriangle size={15} /> J’ai réglé · prévenir l’équipe
        </SubmitButton>
      </form>
    </Card>
  );
}
