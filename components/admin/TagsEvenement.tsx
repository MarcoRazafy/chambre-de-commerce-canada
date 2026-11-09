"use client";

import { Tag } from "lucide-react";
import { ChoixTags } from "@/components/admin/ChoixTags";
import { Modal } from "@/components/Modal";
import { CancelButton, ModalBody, ModalFooter, SubmitButton } from "@/components/form-bits";
import { majTagsEvenement } from "@/lib/actions/events";

// Bouton « Tags des inscrits » de la page d'un événement : les tags posés sur chaque entreprise membre inscrite
export function TagsEvenement({
  eventId,
  tags,
  tousTags,
  inscrites,
}: {
  eventId: string;
  tags: string[];
  tousTags: string[];
  inscrites: number;
}) {
  return (
    <Modal
      title="Tags des inscrits"
      trigger={(ouvrir) => (
        <button type="button" onClick={ouvrir} className="btn-contour btn-contour-sm text-ink hover:bg-surface-2">
          <Tag size={14} /> Tags des inscrits
          {tags.length ? (
            <span className="ml-0.5 min-w-[20px] h-5 px-1.5 rounded-full bg-accent text-white text-[11px] font-bold grid place-items-center tabular-nums">
              {tags.length}
            </span>
          ) : null}
        </button>
      )}
    >
      {(fermer) => (
        <form action={majTagsEvenement}>
          <input type="hidden" name="eventId" value={eventId} />
          <ModalBody>
            <p className="m-0 text-[13px] text-muted">
              Chaque entreprise membre qui s’inscrit reçoit ces tags.
              {inscrites
                ? ` Les ${inscrites} entreprise${inscrites > 1 ? "s" : ""} déjà inscrite${inscrites > 1 ? "s" : ""} les reçoivent à l’enregistrement.`
                : ""}
            </p>
            <ChoixTags name="etiquettes" options={tousTags} initiaux={tags} creation />
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="Enregistrement…">
              <Tag size={14} /> Enregistrer
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
