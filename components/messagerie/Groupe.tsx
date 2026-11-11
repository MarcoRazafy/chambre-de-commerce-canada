"use client";

import { useState } from "react";
import { LogOut, UserPlus, Users } from "lucide-react";
import { Modal } from "@/components/Modal";
import { INPUT } from "@/components/champ-style";
import { CancelButton, FermerApresEnvoi, Field, ModalBody, ModalFooter, SubmitButton } from "@/components/form-bits";
import {
  ajouterParticipants,
  creerGroupe,
  quitterGroupe,
} from "@/lib/actions/messages";
import { LONGUEUR_NOM_GROUPE, MAX_PARTICIPANTS_GROUPE } from "@/lib/messagerie";
import type { Space } from "@/lib/types";
import { EntreeFichier } from "@/components/EnvoisSuivis";
import { ListeACocher, type ElementACocher } from "./ListeACocher";

export function NouveauGroupe({
  space,
  personnes,
}: {
  space: Space;
  personnes: ElementACocher[];
}) {
  const [nombre, setNombre] = useState(0);
  const [nom, setNom] = useState("");

  return (
    <Modal
      title="Nouveau groupe"
      wide
      trigger={(ouvrir) => (
        <button
          type="button"
          onClick={() => {
            setNombre(0);
            setNom("");
            ouvrir();
          }}
          aria-label="Créer un groupe"
          title="Créer un groupe"
          className="w-[38px] h-[38px] rounded-[var(--radius-s)] border border-line bg-surface-2 text-muted flex items-center justify-center cursor-pointer shrink-0 hover:text-accent hover:border-accent"
        >
          <Users size={17} />
        </button>
      )}
    >
      {(fermer) => (
        <form action={creerGroupe}>
          <FermerApresEnvoi fermer={fermer} />
          <input type="hidden" name="space" value={space} />
          <ModalBody>
            <Field label="Nom du groupe">
              <input
                name="nom"
                required
                maxLength={LONGUEUR_NOM_GROUPE}
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex. Comité export agroalimentaire"
                className={INPUT}
              />
            </Field>
            <Field
              label="Photo du groupe"
              hint="Facultative ; sans photo, le groupe prend ses initiales."
            >
              <EntreeFichier
                name="photo"
                accept="image/*"
                className="block w-full text-[13px] text-muted file:mr-3 file:rounded-[var(--radius-s)] file:border file:border-line file:bg-surface-2 file:px-3 file:py-1.5 file:text-[12.8px] file:font-semibold file:text-ink file:cursor-pointer"
              />
            </Field>
            <div>
              <span className="block text-[12.3px] font-semibold text-muted mb-1.5">
                Participants
              </span>
              <ListeACocher
                name="participant"
                sections={[{ elements: personnes }]}
                max={MAX_PARTICIPANTS_GROUPE - 1}
                onCompte={setNombre}
                placeholder="Rechercher une personne, une entreprise…"
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton
              pendingLabel="Création…"
              disabled={nombre === 0 || !nom.trim()}
            >
              <Users size={14} /> Créer le groupe
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

export function AjouterParticipants({
  threadId,
  space,
  personnes,
}: {
  threadId: string;
  space: Space;
  personnes: ElementACocher[];
}) {
  const [nombre, setNombre] = useState(0);
  return (
    <Modal
      title="Ajouter des participants"
      trigger={(ouvrir) => (
        <button
          type="button"
          onClick={() => {
            setNombre(0);
            ouvrir();
          }}
          className="inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-s)] border border-line px-3 py-2 text-[12.8px] font-semibold text-ink cursor-pointer bg-transparent hover:border-faint hover:bg-surface-2"
        >
          <UserPlus size={14} /> Ajouter des participants
        </button>
      )}
    >
      {(fermer) => (
        <form action={ajouterParticipants}>
          <FermerApresEnvoi fermer={fermer} />
          <input type="hidden" name="threadId" value={threadId} />
          <input type="hidden" name="space" value={space} />
          <ModalBody>
            <ListeACocher
              name="participant"
              sections={[{ elements: personnes }]}
              onCompte={setNombre}
              placeholder="Rechercher une personne, une entreprise…"
            />
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="Ajout…" disabled={nombre === 0}>
              <UserPlus size={14} /> Ajouter{nombre > 1 ? ` (${nombre})` : ""}
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

export function QuitterGroupe({
  threadId,
  nom,
  space,
}: {
  threadId: string;
  nom: string;
  space: Space;
}) {
  return (
    <Modal
      title="Quitter le groupe"
      trigger={(ouvrir) => (
        <button
          type="button"
          onClick={ouvrir}
          className="inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-s)] border border-bad-soft px-3 py-2 text-[12.8px] font-semibold text-bad cursor-pointer bg-transparent hover:bg-bad-soft"
        >
          <LogOut size={14} /> Quitter le groupe
        </button>
      )}
    >
      {(fermer) => (
        <form action={quitterGroupe}>
          <FermerApresEnvoi fermer={fermer} />
          <input type="hidden" name="threadId" value={threadId} />
          <input type="hidden" name="space" value={space} />
          <ModalBody>
            <p className="m-0 text-[13.6px] leading-relaxed">
              Quitter <b>{nom}</b> ? Vos messages y restent, mais vous ne verrez
              plus la conversation. Pour y revenir, un participant devra vous
              ajouter à nouveau.
            </p>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="…" variant="danger">
              <LogOut size={14} /> Quitter
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
