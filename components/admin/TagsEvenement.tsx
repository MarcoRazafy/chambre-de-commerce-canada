"use client";

import { Plus, Tag } from "lucide-react";
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
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.length ? (
            tags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={ouvrir}
                title="Modifier les tags des inscrits"
                className="inline-flex items-center gap-1 rounded-full border-0 bg-accent-soft text-accent-strong px-2.5 py-1 text-[12.5px] font-semibold cursor-pointer hover:bg-accent hover:text-white transition-colors duration-150"
              >
                <Tag size={12} aria-hidden /> {t}
              </button>
            ))
          ) : (
            <button
              type="button"
              onClick={ouvrir}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-line bg-transparent text-muted px-2.5 py-1 text-[12.5px] font-semibold cursor-pointer hover:border-accent hover:text-accent transition-colors duration-150"
            >
              <Plus size={12} aria-hidden /> Ajouter un tag
            </button>
          )}
        </div>
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
