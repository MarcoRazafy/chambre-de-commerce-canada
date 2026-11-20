"use client";

import { Check } from "lucide-react";
import { Modal } from "@/components/Modal";
import { INPUT } from "@/components/champ-style";
import { CancelButton, Field, ModalBody, ModalFooter, SubmitButton } from "@/components/form-bits";
import { marquerFacturePayee } from "@/lib/actions/gm";
import { MODES_PAIEMENT_CHAMBRE } from "@/lib/modes-paiement-chambre";

export type FactureAPayer = { id: string; numero: string; total: string };

export function ConfirmerPaiementChambre({ chambreId, nom, factures, retour }: { chambreId: string; nom: string; factures: FactureAPayer[]; retour?: string }) {
  if (!factures.length) return null;
  const aujourdhui = new Date().toISOString().slice(0, 10);

  return (
    <div className="inline-block text-left">
      <Modal
        title="Confirmer le paiement"
        trigger={(ouvrir) => (
          <button type="button" onClick={ouvrir} className="btn-action btn-action-sm whitespace-nowrap">
            <Check size={14} aria-hidden /> Confirmer le paiement
          </button>
        )}
      >
        {(fermer) => (
          <form action={marquerFacturePayee}>
            <input type="hidden" name="chambreId" value={chambreId} />
            {retour ? <input type="hidden" name="retour" value={retour} /> : null}
            <ModalBody>
              <p className="text-[13px] text-muted m-0">{nom}</p>
              {factures.length > 1 ? (
                <Field label="Facture">
                  <select name="factureId" className={INPUT} defaultValue={factures[0].id}>
                    {factures.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.numero} · {f.total}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <>
                  <input type="hidden" name="factureId" value={factures[0].id} />
                  <Field label="Facture">
                    <p className="m-0 text-[14px] font-semibold tabular-nums">
                      {factures[0].numero} · {factures[0].total}
                    </p>
                  </Field>
                </>
              )}
              <div className="grid gap-3.5 md:grid-cols-2">
                <Field label="Mode de paiement">
                  <select name="mode" className={INPUT} defaultValue={MODES_PAIEMENT_CHAMBRE[0]}>
                    {MODES_PAIEMENT_CHAMBRE.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Date du paiement">
                  <input type="date" name="date" defaultValue={aujourdhui} max={aujourdhui} className={INPUT} />
                </Field>
              </div>
              <Field label="Note interne (optionnel)">
                <input type="text" name="note" maxLength={200} className={INPUT} />
              </Field>
            </ModalBody>
            <ModalFooter>
              <CancelButton onClick={fermer} />
              <SubmitButton pendingLabel="Enregistrement…">
                <Check size={14} aria-hidden /> Confirmer le paiement
              </SubmitButton>
            </ModalFooter>
          </form>
        )}
      </Modal>
    </div>
  );
}
