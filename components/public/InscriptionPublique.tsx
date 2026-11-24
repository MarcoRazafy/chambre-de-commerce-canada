"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { ChoixSupplements } from "@/components/forms/ChoixSupplements";
import type { Supplement } from "@/lib/supplements";
import { Modal } from "@/components/Modal";
import { INPUT } from "@/components/champ-style";
import { CancelButton, Field, ModalBody, ModalFooter, SubmitButton } from "@/components/form-bits";
import { ChampsCoordonnees } from "@/components/forms/EventForms";
import { inscriptionPublique } from "@/lib/actions/events";
import { fmtMoney } from "@/lib/format";

export function InscriptionPublique({
  chambre,
  event,
}: {
  chambre: string;
  event: {
    id: string;
    titre: string;
    lieu: string;
    payant: boolean;
    prix: number;
    restantes: number;
    enLigne: boolean;
    supplements: Supplement[];
  };
}) {
  const [parPersonne, setParPersonne] = useState(event.prix);
  const payant = parPersonne > 0;
  return (
    <Modal
      title="Inscription à l’événement"
      trigger={(ouvrir) => (
        <button type="button" onClick={ouvrir} className="btn-action w-full">
          S’inscrire <ArrowRight size={16} />
        </button>
      )}
    >
      {(fermer) => (
        <form action={inscriptionPublique}>
          <input type="hidden" name="chambre" value={chambre} />
          <input type="hidden" name="eventId" value={event.id} />
          <ModalBody>
            <div>
              <div className="font-semibold text-[15px]">{event.titre}</div>
              <div className="text-[12.5px] text-muted">
                {event.lieu} · {event.restantes} place
                {event.restantes > 1 ? "s" : ""} restante
                {event.restantes > 1 ? "s" : ""}
              </div>
            </div>

            <Field label="Nom de l’entreprise">
              <input
                type="text"
                name="entreprise"
                required
                maxLength={120}
                autoComplete="organization"
                placeholder="Votre entreprise — N/A à titre personnel"
                className={INPUT}
              />
            </Field>

            <Field
              label="Nom du représentant"
              hint="Vous recevez votre QR code par e-mail."
            >
              <input
                type="text"
                name="representant"
                required
                maxLength={80}
                autoComplete="name"
                placeholder="Prénom et nom"
                className={INPUT}
              />
            </Field>

            <ChampsCoordonnees />

            <ChoixSupplements supplements={event.supplements} base={event.prix} onTotal={setParPersonne} />

            {payant ? (
              <p className="text-[13px] text-warn bg-warn-soft rounded-[var(--radius-s)] px-3.5 py-3 m-0">
                <b>À régler · {fmtMoney(parPersonne)} par personne</b>
                <br />
                {event.enLigne
                  ? "À l’étape suivante, vous choisissez comment régler."
                  : "À régler auprès de l’équipe de la Chambre avant l’événement."}
              </p>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="Inscription…">
              {payant && event.enLigne ? (
                <>
                  Suivant <ArrowRight size={14} />
                </>
              ) : (
                <>
                  <Check size={14} /> Confirmer l’inscription
                </>
              )}
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
