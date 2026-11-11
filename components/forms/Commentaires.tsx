"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { Check, Pencil, Send, ThumbsUp, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { INPUT } from "@/components/champ-style";
import { CancelButton, FermerApresEnvoi, ModalBody, ModalFooter, SubmitButton } from "@/components/form-bits";
import {
  SelecteurEmojis,
  insererAuCurseur,
} from "@/components/SelecteurEmojis";
import { TexteLie } from "@/components/TexteLie";
import { Card } from "@/components/ui";
import {
  basculerJaimeCommentaire,
  modifierCommentaire,
  postComment,
  supprimerCommentaire,
} from "@/lib/actions/content";
import { fmtDate } from "@/lib/format";
import type { Comment, Space } from "@/lib/types";

export function FormulaireCommentaire({
  space,
  retour,
  newsId,
  resourceId,
}: {
  space: Space;
  retour: string;
  newsId?: string;
  resourceId?: string;
}) {
  const zone = useRef<HTMLTextAreaElement>(null);
  return (
    <form action={postComment} className="flex flex-col gap-2.5">
      <input type="hidden" name="space" value={space} />
      <input type="hidden" name="retour" value={retour} />
      {newsId ? <input type="hidden" name="newsId" value={newsId} /> : null}
      {resourceId ? (
        <input type="hidden" name="resourceId" value={resourceId} />
      ) : null}
      <textarea
        ref={zone}
        name="texte"
        rows={3}
        required
        placeholder="Ajouter un commentaire…"
        className={INPUT}
      />
      <div className="flex items-center justify-between gap-2">
        <SelecteurEmojis
          onChoisir={(e) => zone.current && insererAuCurseur(zone.current, e)}
        />
        <SubmitButton sm pendingLabel="Publication…">
          <Send size={13} /> Publier le commentaire
        </SubmitButton>
      </div>
    </form>
  );
}

export function CarteCommentaire({
  commentaire: c,
  space,
  retour,
}: {
  commentaire: Comment;
  space: Space;
  retour: string;
}) {
  const [edition, setEdition] = useState(false);
  const zone = useRef<HTMLTextAreaElement>(null);
  const [etat, basculer] = useOptimistic(
    { jaimes: c.jaimes, jaimeParMoi: c.jaimeParMoi },
    (courant) => ({
      jaimeParMoi: !courant.jaimeParMoi,
      jaimes: courant.jaimes + (courant.jaimeParMoi ? -1 : 1),
    }),
  );
  const [, demarrer] = useTransition();
  const moderation = space === "admin" && !c.moi;

  const aimer = () => {
    const fd = new FormData();
    fd.set("commentId", c.id);
    fd.set("space", space);
    demarrer(async () => {
      basculer(null);
      await basculerJaimeCommentaire(fd);
    });
  };

  const lienAction =
    "inline-flex items-center gap-1 text-[12.3px] font-semibold cursor-pointer border-0 bg-transparent p-0";

  return (
    <Card className="p-4">
      <div className="flex justify-between gap-2.5">
        <div className="font-semibold text-[13px]">
          {c.auteur}{" "}
          <span className="font-normal text-muted">· {c.entreprise}</span>
        </div>
        <div className="text-[11.5px] text-faint whitespace-nowrap">
          {fmtDate(c.date, { day: "numeric", month: "short" })}
          {c.modifie ? " · modifié" : ""}
        </div>
      </div>

      {edition ? (
        <form action={modifierCommentaire} className="mt-2 flex flex-col gap-2">
          <FermerApresEnvoi fermer={() => setEdition(false)} />
          <input type="hidden" name="commentId" value={c.id} />
          <input type="hidden" name="space" value={space} />
          <input type="hidden" name="retour" value={retour} />
          <textarea
            ref={zone}
            name="texte"
            rows={3}
            required
            autoFocus
            defaultValue={c.texte}
            aria-label="Modifier le commentaire"
            onKeyDown={(e) => {
              if (e.key === "Escape") setEdition(false);
            }}
            className={INPUT}
          />
          <div className="flex items-center justify-between gap-2">
            <SelecteurEmojis
              onChoisir={(e) =>
                zone.current && insererAuCurseur(zone.current, e)
              }
            />
            <span className="flex gap-2">
              <CancelButton onClick={() => setEdition(false)} />
              <SubmitButton sm pendingLabel="Enregistrement…">
                <Check size={13} /> Enregistrer
              </SubmitButton>
            </span>
          </div>
        </form>
      ) : (
        <div className="text-[13.4px] mt-1.5 leading-relaxed whitespace-pre-line">
          <TexteLie texte={c.texte} />
        </div>
      )}

      {edition ? null : (
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          <button
            type="button"
            onClick={aimer}
            aria-pressed={etat.jaimeParMoi}
            aria-label={etat.jaimeParMoi ? "Je n’aime plus" : "J’aime"}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.3px] font-semibold border cursor-pointer transition-colors ${
              etat.jaimeParMoi
                ? "bg-accent-soft border-accent/40 text-accent-strong"
                : "bg-transparent border-line text-muted hover:text-ink hover:border-faint"
            }`}
          >
            <ThumbsUp
              size={13}
              className={etat.jaimeParMoi ? "fill-current" : ""}
            />
            <span className="tabular-nums">{etat.jaimes}</span>
          </button>

          {c.moi ? (
            <button
              type="button"
              onClick={() => setEdition(true)}
              className={`${lienAction} text-muted hover:text-ink`}
            >
              <Pencil size={12} /> Modifier
            </button>
          ) : null}

          {c.moi || moderation ? (
            <Modal
              title={
                c.moi ? "Supprimer le commentaire" : "Retirer le commentaire"
              }
              trigger={(ouvrir) => (
                <button
                  type="button"
                  onClick={ouvrir}
                  className={`${lienAction} text-muted hover:text-accent`}
                >
                  <Trash2 size={12} /> {c.moi ? "Supprimer" : "Retirer"}
                </button>
              )}
            >
              {(fermer) => (
                <form action={supprimerCommentaire}>
                  <FermerApresEnvoi fermer={fermer} />
                  <input type="hidden" name="commentId" value={c.id} />
                  <input type="hidden" name="space" value={space} />
                  <input type="hidden" name="retour" value={retour} />
                  <ModalBody>
                    <p className="m-0 text-[13.6px] text-muted">
                      {c.moi
                        ? "Votre commentaire sera supprimé, avec ses « j’aime »."
                        : `Retirer le commentaire de ${c.auteur} ? Son texte reste consultable au journal d’activité.`}
                    </p>
                  </ModalBody>
                  <ModalFooter>
                    <CancelButton onClick={fermer} />
                    <SubmitButton variant="danger" pendingLabel="Suppression…">
                      <Trash2 size={14} /> {c.moi ? "Supprimer" : "Retirer"}
                    </SubmitButton>
                  </ModalFooter>
                </form>
              )}
            </Modal>
          ) : null}
        </div>
      )}
    </Card>
  );
}
