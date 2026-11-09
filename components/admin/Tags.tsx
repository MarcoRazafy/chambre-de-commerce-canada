"use client";

import { useState } from "react";
import { Plus, Search, Tag } from "lucide-react";
import { Modal } from "@/components/Modal";
import { CancelButton, Field, INPUT, ModalBody, ModalFooter, SubmitButton } from "@/components/form-bits";
import { attribuerEtiquette } from "@/lib/actions/maillage";
import { plat } from "@/lib/texte";

export interface MembreTag {
  id: string;
  nom: string;
}

// Membres à cocher, avec une recherche par nom
export function ChoixMembres({ membres }: { membres: MembreTag[] }) {
  const [q, setQ] = useState("");
  const visibles = q ? membres.filter((m) => plat(m.nom).includes(plat(q))) : membres;
  if (!membres.length) return <p className="m-0 text-[13px] text-muted">Tous les membres ont déjà ce tag.</p>;
  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un membre…"
          aria-label="Rechercher un membre"
          className={`${INPUT} pl-8`}
        />
      </div>
      <div className="max-h-[260px] overflow-y-auto rounded-[var(--radius-s)] border border-line p-1.5 grid gap-0.5 grid-cols-1 sm:grid-cols-2">
        {membres.map((m) => (
          <label
            key={m.id}
            className={`${visibles.includes(m) ? "flex" : "hidden"} items-center gap-2.5 rounded-[var(--radius-s)] px-2.5 py-2 text-[13.4px] text-ink cursor-pointer hover:bg-surface-2`}
          >
            <input type="checkbox" name="membres" value={m.id} className="accent-[var(--accent)] w-4 h-4" />
            <span className="truncate">{m.nom}</span>
          </label>
        ))}
        {!visibles.length ? <p className="m-0 px-2.5 py-2 text-[13px] text-muted">Aucun membre trouvé.</p> : null}
      </div>
    </div>
  );
}

// Bouton « Ajouter un tag » : un nom, puis les membres qui le reçoivent
export function NouveauTag({ membres }: { membres: MembreTag[] }) {
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
            <Field label="Membres">
              <ChoixMembres membres={membres} />
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
