"use client";

import { useState } from "react";
import { Plus, Search, Tag } from "lucide-react";
import { Modal } from "@/components/Modal";
import { CancelButton, Field, INPUT, ModalBody, ModalFooter, SubmitButton } from "@/components/form-bits";
import { attribuerEtiquette } from "@/lib/actions/maillage";
import { plat } from "@/lib/texte";

export interface ContactTag {
  id: string;
  nom: string;
  fonction: string;
  entreprise: string;
}

// Contacts à cocher (nom, puis entreprise), avec une recherche sur les deux
export function ChoixContacts({ contacts }: { contacts: ContactTag[] }) {
  const [q, setQ] = useState("");
  const visible = (c: ContactTag) => !q || plat(`${c.nom} ${c.entreprise} ${c.fonction}`).includes(plat(q));
  if (!contacts.length) return <p className="m-0 text-[13px] text-muted">Tous les contacts ont déjà ce tag.</p>;
  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nom, entreprise, fonction…"
          aria-label="Rechercher un contact"
          className={`${INPUT} pl-8`}
        />
      </div>
      <div className="max-h-[300px] overflow-y-auto rounded-[var(--radius-s)] border border-line p-1.5 flex flex-col gap-0.5">
        {contacts.map((c) => (
          <label
            key={c.id}
            className={`${visible(c) ? "flex" : "hidden"} items-center gap-3 rounded-[var(--radius-s)] px-2.5 py-2 cursor-pointer hover:bg-surface-2`}
          >
            <input type="checkbox" name="contacts" value={c.id} className="accent-[var(--accent)] w-4 h-4 shrink-0" />
            <span className="min-w-0">
              <span className="block text-[13.4px] font-semibold text-ink truncate">{c.nom}</span>
              <span className="block text-[12.3px] text-muted truncate">
                {c.entreprise}{c.fonction ? ` · ${c.fonction}` : ""}
              </span>
            </span>
          </label>
        ))}
        {!contacts.some(visible) ? <p className="m-0 px-2.5 py-2 text-[13px] text-muted">Aucun contact trouvé.</p> : null}
      </div>
    </div>
  );
}

// Bouton « Ajouter un tag » : un nom, puis les contacts qui le reçoivent
export function NouveauTag({ contacts }: { contacts: ContactTag[] }) {
  return (
    <Modal
      title="Ajouter un tag"
      wide
      trigger={(ouvrir) => (
        <button type="button" onClick={ouvrir} className="btn-action btn-action-sm">
          <Plus size={15} /> Ajouter un tag
        </button>
      )}
    >
      {(fermer) => (
        <form action={attribuerEtiquette}>
          <ModalBody>
            <Field label="Nom du tag">
              <input name="nom" required maxLength={60} placeholder="Ex. Exportateurs, VIP gala" className={INPUT} />
            </Field>
            <Field label="Contacts">
              <ChoixContacts contacts={contacts} />
            </Field>
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            <SubmitButton pendingLabel="Ajout…">
              <Tag size={14} /> Créer le tag
            </SubmitButton>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
