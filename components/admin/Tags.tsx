"use client";

import { useState } from "react";
import { Plus, Search, Tag, UserPlus } from "lucide-react";
import { Modal } from "@/components/Modal";
import {
  CancelButton,
  Field,
  INPUT,
  ModalBody,
  ModalFooter,
  SubmitButton,
} from "@/components/form-bits";
import { attribuerEtiquette, creerTag } from "@/lib/actions/maillage";
import { plat } from "@/lib/texte";

export interface ContactTag {
  id: string;
  nom: string;
  email: string;
  entreprise: string;
}

// Contacts à cocher : nom, courriel et entreprise ; filtre par entreprise et recherche
function ChoixContacts({ contacts }: { contacts: ContactTag[] }) {
  const [q, setQ] = useState("");
  const [entreprise, setEntreprise] = useState("");
  const entreprises = [...new Set(contacts.map((c) => c.entreprise))].sort(
    (a, b) => a.localeCompare(b, "fr"),
  );
  const visible = (c: ContactTag) =>
    (!entreprise || c.entreprise === entreprise) &&
    (!q || plat(`${c.nom} ${c.email} ${c.entreprise}`).includes(plat(q)));

  if (!contacts.length)
    return (
      <p className="m-0 text-[13px] text-muted">
        Tous les contacts ont déjà ce tag.
      </p>
    );
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 flex-wrap">
        <select
          value={entreprise}
          onChange={(e) => setEntreprise(e.target.value)}
          aria-label="Entreprise"
          className={`${INPUT} sm:w-[220px] flex-1 sm:flex-none`}
        >
          <option value="">Toutes les entreprises</option>
          {entreprises.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <div className="relative flex-1 min-w-[180px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none"
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nom ou courriel…"
            aria-label="Rechercher un contact"
            className={`${INPUT} pl-8`}
          />
        </div>
      </div>
      <div className="max-h-[320px] overflow-y-auto rounded-[var(--radius-s)] border border-line">
        {contacts.map((c) => (
          <label
            key={c.id}
            className={`${visible(c) ? "flex" : "hidden"} items-center gap-3 px-3 py-2.5 border-b border-line last:border-b-0 cursor-pointer hover:bg-surface-2`}
          >
            <input
              type="checkbox"
              name="contacts"
              value={c.id}
              className="accent-[var(--accent)] w-4 h-4 shrink-0"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[13.4px] font-semibold text-ink truncate">
                {c.nom}
              </span>
              <span className="block text-[12.3px] text-muted truncate">
                {c.email}
              </span>
            </span>
            <span className="text-[12.5px] text-ink text-right shrink-0 max-w-[40%] truncate">
              {c.entreprise}
            </span>
          </label>
        ))}
        {!contacts.some(visible) ? (
          <p className="m-0 px-3 py-2.5 text-[13px] text-muted">
            Aucun contact trouvé.
          </p>
        ) : null}
      </div>
    </div>
  );
}

// Bouton « Ajouter un tag » : son nom suffit ; on arrive ensuite sur sa page pour y ajouter des contacts
export function NouveauTag() {
  return (
    <Modal
      title="Ajouter un tag"
      trigger={(ouvrir) => (
        <button
          type="button"
          onClick={ouvrir}
          className="btn-action btn-action-sm"
        >
          <Plus size={15} /> Ajouter un tag
        </button>
      )}
    >
      {(fermer) => (
        <form action={creerTag}>
          <ModalBody>
            <Field label="Nom du tag">
              <input
                name="nom"
                required
                autoFocus
                maxLength={60}
                placeholder="Ex. Exportateurs, VIP gala"
                className={INPUT}
              />
            </Field>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="Création…">
              <Tag size={14} /> Créer le tag
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}

// Bouton « Ajouter un contact » d'un tag : les contacts qui ne l'ont pas encore
export function AjouterContactsTag({
  nom,
  contacts,
}: {
  nom: string;
  contacts: ContactTag[];
}) {
  return (
    <Modal
      title={`Ajouter des contacts à « ${nom} »`}
      wide
      trigger={(ouvrir) => (
        <button
          type="button"
          onClick={ouvrir}
          className="btn-action btn-action-sm"
        >
          <UserPlus size={15} /> Ajouter un contact
        </button>
      )}
    >
      {(fermer) => (
        <form action={attribuerEtiquette}>
          <input type="hidden" name="nom" value={nom} />
          <ModalBody>
            <ChoixContacts contacts={contacts} />
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            {contacts.length ? (
              <SubmitButton pendingLabel="Ajout…">
                <UserPlus size={14} /> Ajouter
              </SubmitButton>
            ) : null}
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
