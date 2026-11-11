"use client";

import { Lock, Send, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { INPUT } from "@/components/champ-style";
import { CancelButton, ModalBody, ModalFooter, SubmitButton } from "@/components/form-bits";
import { ilYa } from "@/components/admin/LigneJournal";
import { TexteLie } from "@/components/TexteLie";
import { Card } from "@/components/ui";
import { ajouterNoteMembre, supprimerNoteMembre } from "@/lib/actions/members";
import type { NoteMembre } from "@/lib/types";

export function NotesMembre({
  memberId,
  notes,
}: {
  memberId: string;
  notes: NoteMembre[];
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2.5">
        <div className="w-[3px] self-stretch min-h-[18px] rounded-sm bg-accent" />
        <h2 className="m-0 text-[17px] font-semibold">
          Commentaires de l’équipe
        </h2>
      </div>

      <p className="m-0 mt-2 flex items-start gap-1.5 text-[12.6px] text-muted">
        <Lock size={13} className="mt-px shrink-0" />
        <span>
          Visibles du back-office seulement. Le membre ne les voit jamais, et
          ils ne partent dans aucun courriel.
        </span>
      </p>

      <form action={ajouterNoteMembre} className="mt-4 flex flex-col gap-2.5">
        <input type="hidden" name="memberId" value={memberId} />
        <textarea
          name="texte"
          rows={3}
          required
          maxLength={2000}
          aria-label="Nouveau commentaire"
          placeholder="Ce qu’il faut savoir sur ce membre, pour l’équipe…"
          className={INPUT}
        />
        <div className="flex justify-end">
          <SubmitButton sm pendingLabel="Enregistrement…">
            <Send size={13} /> Ajouter le commentaire
          </SubmitButton>
        </div>
      </form>

      {notes.length ? (
        <ul className="m-0 mt-5 flex list-none flex-col gap-3 p-0">
          {notes.map((n) => (
            <li
              key={n.id}
              className="rounded-[var(--radius-m)] border border-line bg-surface-2 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="m-0 text-[13.6px] leading-relaxed whitespace-pre-line">
                  <TexteLie texte={n.texte} />
                </p>
                <SupprimerNote note={n} />
              </div>
              <div className="mt-2 text-[12.2px] text-faint">
                {n.moi ? "Vous" : n.auteur} · {ilYa(n.date)}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 mt-5 rounded-[var(--radius-m)] border border-dashed border-line px-4 py-6 text-center text-[13.2px] text-muted">
          Aucun commentaire sur ce membre.
        </p>
      )}
    </Card>
  );
}

function SupprimerNote({ note }: { note: NoteMembre }) {
  return (
    <Modal
      title="Retirer le commentaire"
      trigger={(ouvrir) => (
        <button
          type="button"
          onClick={ouvrir}
          aria-label="Retirer ce commentaire"
          title="Retirer"
          className="shrink-0 cursor-pointer border-0 bg-transparent p-1 text-faint hover:text-accent"
        >
          <Trash2 size={14} />
        </button>
      )}
    >
      {(fermer) => (
        <form action={supprimerNoteMembre}>
          <input type="hidden" name="noteId" value={note.id} />
          <ModalBody>
            <p className="m-0 text-[13.8px] text-muted">
              Ce commentaire sera effacé. Il n’apparaîtra plus pour personne, et
              rien n’en garde la trace.
            </p>
            <blockquote className="m-0 rounded-[var(--radius-m)] border border-line bg-surface-2 px-4 py-3 text-[13.4px] whitespace-pre-line">
              {note.texte}
            </blockquote>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton variant="danger" pendingLabel="Retrait…">
              <Trash2 size={14} /> Retirer
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
