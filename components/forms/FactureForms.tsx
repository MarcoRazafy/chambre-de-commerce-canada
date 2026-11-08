"use client";

import { useState } from "react";
import { Check, FilePlus2, Trash2, TriangleAlert } from "lucide-react";
import { Modal } from "@/components/Modal";
import {
  CancelButton,
  Field,
  INPUT,
  ModalBody,
  ModalFooter,
  SubmitButton,
} from "@/components/form-bits";
import {
  creerFacture,
  marquerFacturePayee,
  supprimerFacture,
} from "@/lib/actions/factures";
import type { Devise } from "@/lib/membership";

const MODES = ["Espèces", "Virement bancaire", "Mobile Money", "Chèque"];

const aujourdhui = () => new Date().toISOString().slice(0, 10);

export function NouvelleFactureButton({
  membres,
}: {
  membres: { id: string; nom: string; devise: Devise }[];
}) {
  const [devise, setDevise] = useState<Devise>(membres[0]?.devise ?? "CAD");
  const [payee, setPayee] = useState(false);

  return (
    <Modal
      title="Nouvelle facture"
      trigger={(ouvrir) => (
        <button
          type="button"
          onClick={ouvrir}
          className="btn-action btn-action-sm"
        >
          <FilePlus2 size={15} /> Nouvelle facture
        </button>
      )}
    >
      {(fermer) => (
        <form action={creerFacture}>
          <ModalBody>
            <Field label="Membre facturé">
              <select
                name="memberId"
                required
                className={INPUT}
                onChange={(e) =>
                  setDevise(
                    membres.find((m) => m.id === e.target.value)?.devise ??
                      "MGA",
                  )
                }
              >
                {membres.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nom}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Objet"
              hint="Une facture dont l’objet commence par « Cotisation » remet le membre à jour une fois réglée."
            >
              <input
                name="objet"
                required
                placeholder="Ex. Stand — Canada Expo Tamatave"
                className={INPUT}
              />
            </Field>
            <div className="grid gap-3.5 grid-cols-[minmax(0,1fr)_130px]">
              <Field label="Montant">
                <input
                  type="number"
                  name="montant"
                  min={1}
                  step={1}
                  required
                  className={INPUT}
                />
              </Field>
              <Field label="Devise">
                <select
                  name="devise"
                  value={devise}
                  onChange={(e) => setDevise(e.target.value as Devise)}
                  className={INPUT}
                >
                  <option value="CAD">Dollars canadiens</option>
                  <option value="MGA">Ariary</option>
                </select>
              </Field>
            </div>
            <div className="grid gap-3.5 md:grid-cols-2">
              <Field label="Date">
                <input
                  type="date"
                  name="date"
                  defaultValue={aujourdhui()}
                  className={INPUT}
                />
              </Field>
              <Field label="Situation">
                <select
                  name="statut"
                  value={payee ? "payee" : "envoyee"}
                  onChange={(e) => setPayee(e.target.value === "payee")}
                  className={INPUT}
                >
                  <option value="envoyee">À régler</option>
                  <option value="payee">Déjà réglée</option>
                </select>
              </Field>
            </div>
            {payee ? (
              <Field label="Mode de paiement">
                <select name="mode" className={INPUT} defaultValue="Espèces">
                  {MODES.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </Field>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="Émission…">
              <Check size={14} /> Émettre la facture
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

export function MarquerPayeeButton({
  factureId,
  numero,
  montant,
  cotisation,
}: {
  factureId: string;
  numero: string;
  montant: string;
  cotisation: boolean;
}) {
  return (
    <Modal
      title={`Régler la facture ${numero}`}
      trigger={(ouvrir) => (
        <button
          type="button"
          onClick={ouvrir}
          className="btn-action btn-action-sm"
        >
          <Check size={15} /> Marquer comme payée
        </button>
      )}
    >
      {(fermer) => (
        <form action={marquerFacturePayee}>
          <input type="hidden" name="factureId" value={factureId} />
          <ModalBody>
            <p className="m-0 text-[13.6px] text-muted">
              Règlement de <b className="text-ink">{montant}</b>.
              {cotisation
                ? " C’est une cotisation : le membre repassera à jour."
                : ""}
            </p>
            <div className="grid gap-3.5 md:grid-cols-2">
              <Field label="Mode de paiement">
                <select name="mode" className={INPUT} defaultValue="Espèces">
                  {MODES.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </Field>
              <Field label="Date du règlement">
                <input
                  type="date"
                  name="date"
                  defaultValue={aujourdhui()}
                  className={INPUT}
                />
              </Field>
            </div>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="Enregistrement…">
              <Check size={14} /> Confirmer le règlement
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

export function SupprimerFactureButton({
  factureId,
  numero,
  montant,
  membre,
  payee,
}: {
  factureId: string;
  numero: string;
  montant: string;
  membre: string;
  payee: boolean;
}) {
  return (
    <Modal
      title="Supprimer la facture"
      trigger={(ouvrir) => (
        <button
          type="button"
          onClick={ouvrir}
          className="inline-flex items-center gap-[7px] rounded-[var(--radius-s)] font-semibold cursor-pointer border border-bad-soft bg-transparent text-bad hover:bg-bad-soft text-[12.4px] px-[11px] py-1.5"
        >
          <Trash2 size={14} /> Supprimer
        </button>
      )}
    >
      {(fermer) => (
        <form action={supprimerFacture}>
          <input type="hidden" name="factureId" value={factureId} />
          <ModalBody>
            <div
              role="alert"
              className="flex gap-3 rounded-[var(--radius-s)] border border-bad-soft bg-bad-soft text-bad px-4 py-3.5"
            >
              <TriangleAlert size={20} className="shrink-0 mt-0.5" />
              <p className="m-0 text-[13.4px] leading-relaxed">
                <b className="block mb-1">
                  La facture {numero} sera supprimée définitivement.
                </b>
                {montant} · {membre}
                {payee
                  ? " — elle est réglée : son encaissement quitte les totaux."
                  : ""}
              </p>
            </div>
            <p className="m-0 mt-4 text-[13px] text-muted leading-relaxed">
              Le journal d’activité garde le numéro, le montant et l’objet, avec
              votre nom. Le membre ne la verra plus dans son historique.
            </p>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton variant="danger" pendingLabel="Suppression…">
              <Trash2 size={14} /> Supprimer la facture
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
