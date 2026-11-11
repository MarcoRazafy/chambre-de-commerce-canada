"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { INPUT } from "@/components/champ-style";
import { CancelButton, FermerApresEnvoi, Field, ModalBody, ModalFooter, SubmitButton } from "@/components/form-bits";
import {
  basculerRappelFait,
  creerRappel,
  modifierRappel,
  supprimerRappel,
} from "@/lib/actions/agenda";
import type { ElementAgenda } from "@/lib/agenda";

export function NouveauRappel({
  jour,
  retour,
  libelle = "Nouveau rappel",
  discret = false,
  apresEnvoi,
}: {
  jour: string;
  retour: string;
  libelle?: string;
  discret?: boolean;
  apresEnvoi?: () => void;
}) {
  return (
    <Modal
      title="Nouveau rappel"
      trigger={(ouvrir) => (
        <button
          type="button"
          onClick={ouvrir}
          className={
            discret
              ? "inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent bg-transparent border-0 p-0 cursor-pointer hover:underline"
              : "btn-action btn-action-sm"
          }
        >
          <Plus size={discret ? 14 : 15} /> {libelle}
        </button>
      )}
    >
      {(fermer) => (
        <FormulaireRappel
          jour={jour}
          retour={retour}
          fermer={fermer}
          apresEnvoi={apresEnvoi}
        />
      )}
    </Modal>
  );
}

export function ActionsRappel({
  element,
  retour,
  apresEnvoi,
}: {
  element: ElementAgenda;
  retour: string;
  apresEnvoi?: () => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  if (!element.rappel) return null;

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <form
        action={
          apresEnvoi
            ? async (fd: FormData) => {
                await basculerRappelFait(fd);
                apresEnvoi();
              }
            : basculerRappelFait
        }
      >
        <input type="hidden" name="rappelId" value={element.rappel.id} />
        <input type="hidden" name="retour" value={retour} />
        <CaseFait fait={Boolean(element.fait)} />
      </form>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        aria-label={`Modifier le rappel « ${element.titre} »`}
        title="Modifier"
        className="w-8 h-8 rounded-[var(--radius-s)] border border-line bg-surface text-muted hover:text-ink hover:bg-surface-2 flex items-center justify-center cursor-pointer"
      >
        <Pencil size={14} />
      </button>
      <ModifierRappel
        element={element}
        retour={retour}
        ouvert={ouvert}
        onFermer={() => setOuvert(false)}
        apresEnvoi={apresEnvoi}
      />
    </div>
  );
}

export function BlocRappel({
  element,
  retour,
  className,
  style,
  children,
}: {
  element: ElementAgenda;
  retour: string;
  className: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        title={`Modifier le rappel « ${element.titre} »`}
        className={`${className} text-left cursor-pointer`}
        style={style}
      >
        {children}
      </button>
      <ModifierRappel
        element={element}
        retour={retour}
        ouvert={ouvert}
        onFermer={() => setOuvert(false)}
      />
    </>
  );
}

function CaseFait({ fait }: { fait: boolean }) {
  return (
    <button
      type="submit"
      aria-pressed={fait}
      aria-label={fait ? "Marquer comme à faire" : "Marquer comme fait"}
      title={fait ? "Fait — décocher" : "Marquer comme fait"}
      className={`w-8 h-8 rounded-[var(--radius-s)] border flex items-center justify-center cursor-pointer disabled:opacity-60 ${
        fait
          ? "bg-success border-success text-white"
          : "bg-surface border-line text-faint hover:text-success-strong hover:border-success"
      }`}
    >
      <Check size={15} strokeWidth={2.5} />
    </button>
  );
}

function ModifierRappel({
  element,
  retour,
  ouvert,
  onFermer,
  apresEnvoi,
}: {
  element: ElementAgenda;
  retour: string;
  ouvert: boolean;
  onFermer: () => void;
  apresEnvoi?: () => void;
}) {
  return (
    <Modal title="Modifier le rappel" ouvert={ouvert} onFermer={onFermer}>
      {(fermer) => (
        <FormulaireRappel
          element={element}
          jour={element.jour}
          retour={retour}
          fermer={fermer}
          apresEnvoi={apresEnvoi}
        />
      )}
    </Modal>
  );
}

function FormulaireRappel({
  element,
  jour,
  retour,
  fermer,
  apresEnvoi,
}: {
  element?: ElementAgenda;
  jour: string;
  retour: string;
  fermer: () => void;
  apresEnvoi?: () => void;
}) {
  const [journee, setJournee] = useState(element ? !element.debut : true);
  const [confirmer, setConfirmer] = useState(false);
  const rappelId = element?.rappel?.id;
  const termine = () => {
    fermer();
    apresEnvoi?.();
  };

  if (confirmer && rappelId) {
    return (
      <form action={supprimerRappel}>
        <input type="hidden" name="rappelId" value={rappelId} />
        <input type="hidden" name="retour" value={retour} />
        <FermerApresEnvoi fermer={termine} />
        <ModalBody>
          <p className="m-0 text-[14px]">
            Supprimer le rappel <strong>« {element.titre} »</strong> ? Il
            disparaîtra de votre agenda.
          </p>
        </ModalBody>
        <ModalFooter>
          <CancelButton onClick={() => setConfirmer(false)} />
          <SubmitButton variant="danger" pendingLabel="Suppression…">
            <Trash2 size={14} /> Supprimer
          </SubmitButton>
        </ModalFooter>
      </form>
    );
  }

  return (
    <form action={rappelId ? modifierRappel : creerRappel}>
      {rappelId ? (
        <input type="hidden" name="rappelId" value={rappelId} />
      ) : null}
      <input type="hidden" name="retour" value={retour} />
      <FermerApresEnvoi fermer={termine} />
      <ModalBody>
        <Field label="Titre">
          <input
            name="titre"
            required
            maxLength={120}
            defaultValue={element?.titre}
            placeholder="Ex. Relancer le transitaire"
            className={INPUT}
          />
        </Field>
        <div className="grid gap-3.5 grid-cols-2">
          <Field label="Date">
            <input
              type="date"
              name="jour"
              required
              defaultValue={jour}
              className={INPUT}
            />
          </Field>
          <Field label="Heure">
            <input
              type="time"
              name="heure"
              required={!journee}
              disabled={journee}
              defaultValue={element?.debut ?? "09:00"}
              className={INPUT}
            />
          </Field>
        </div>
        <label className="flex items-center gap-2.5 text-[13.4px] cursor-pointer w-fit">
          <input
            type="checkbox"
            name="journee"
            value="1"
            checked={journee}
            onChange={(e) => setJournee(e.target.checked)}
            className="w-4 h-4 accent-[var(--accent)]"
          />
          Toute la journée
        </label>
        <Field label="Note" hint="Facultatif · 500 caractères au plus.">
          <textarea
            name="note"
            rows={3}
            maxLength={500}
            defaultValue={element?.rappel?.note ?? ""}
            className={INPUT}
          />
        </Field>
      </ModalBody>
      <ModalFooter>
        {rappelId ? (
          <button
            type="button"
            onClick={() => setConfirmer(true)}
            className="mr-auto inline-flex items-center gap-1.5 text-[13px] font-semibold text-bad bg-transparent border-0 cursor-pointer hover:underline"
          >
            <Trash2 size={14} /> Supprimer
          </button>
        ) : null}
        <CancelButton onClick={fermer} />
        <SubmitButton pendingLabel="Enregistrement…">
          {rappelId ? "Enregistrer" : "Ajouter"}
        </SubmitButton>
      </ModalFooter>
    </form>
  );
}
