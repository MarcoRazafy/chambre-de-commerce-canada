"use client";

import { useState } from "react";
import { Building2, Plus, Search, Tag } from "lucide-react";
import { Modal } from "@/components/Modal";
import { LogoMark } from "@/components/domain";
import { INPUT } from "@/components/champ-style";
import { CancelButton, Field, ModalBody, ModalFooter, SubmitButton } from "@/components/form-bits";
import { attribuerEtiquette, creerTag } from "@/lib/actions/maillage";
import type { MemberType } from "@/lib/types";
import { plat } from "@/lib/texte";

export interface EntrepriseTag {
  id: string;
  nom: string;
  type: MemberType;
  photo: string | null;
  logo: string | null;
  contact: string | null;
  email: string | null;
}

// Entreprises à cocher : logo, nom, contact principal et son courriel ; recherche sur le tout
function ChoixEntreprises({ entreprises }: { entreprises: EntrepriseTag[] }) {
  const [q, setQ] = useState("");
  const visible = (e: EntrepriseTag) => !q || plat(`${e.nom} ${e.contact ?? ""} ${e.email ?? ""}`).includes(plat(q));
  if (!entreprises.length) return <p className="m-0 text-[13px] text-muted">Toutes les entreprises ont déjà ce tag.</p>;
  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(ev) => setQ(ev.target.value)}
          placeholder="Entreprise, contact ou courriel…"
          aria-label="Rechercher une entreprise"
          className={`${INPUT} pl-8`}
        />
      </div>
      <div className="max-h-[340px] overflow-y-auto rounded-[var(--radius-s)] border border-line">
        {entreprises.map((e) => (
          <label
            key={e.id}
            className={`${visible(e) ? "flex" : "hidden"} items-center gap-3 px-3 py-2.5 border-b border-line last:border-b-0 cursor-pointer hover:bg-surface-2`}
          >
            <input type="checkbox" name="entreprises" value={e.id} className="accent-[var(--accent)] w-4 h-4 shrink-0" />
            <span className="w-[54px] flex justify-center shrink-0">
              <LogoMark member={e} size={30} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.4px] font-semibold text-ink truncate">{e.nom}</span>
              <span className="block text-[12.3px] text-muted truncate">
                {e.contact ? `${e.contact} · ${e.email}` : "Aucun contact"}
              </span>
            </span>
          </label>
        ))}
        {!entreprises.some(visible) ? <p className="m-0 px-3 py-2.5 text-[13px] text-muted">Aucune entreprise trouvée.</p> : null}
      </div>
    </div>
  );
}

// Bouton « Ajouter un tag » : son nom suffit ; on arrive ensuite sur sa page pour y ajouter des entreprises
export function NouveauTag() {
  return (
    <Modal
      title="Ajouter un tag"
      trigger={(ouvrir) => (
        <button type="button" onClick={ouvrir} className="btn-action btn-action-sm">
          <Plus size={15} /> Ajouter un tag
        </button>
      )}
    >
      {(fermer) => (
        <form action={creerTag}>
          <ModalBody>
            <Field label="Nom du tag">
              <input name="nom" required autoFocus maxLength={60} placeholder="Ex. Exportateurs, VIP gala" className={INPUT} />
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

// Bouton « Ajouter une entreprise » d'un tag : les entreprises qui ne l'ont pas encore
export function AjouterEntreprisesTag({ nom, entreprises }: { nom: string; entreprises: EntrepriseTag[] }) {
  return (
    <Modal
      title={`Ajouter des entreprises à « ${nom} »`}
      wide
      trigger={(ouvrir) => (
        <button type="button" onClick={ouvrir} className="btn-action btn-action-sm">
          <Building2 size={15} /> Ajouter une entreprise
        </button>
      )}
    >
      {(fermer) => (
        <form action={attribuerEtiquette}>
          <input type="hidden" name="nom" value={nom} />
          <ModalBody>
            <ChoixEntreprises entreprises={entreprises} />
          </ModalBody>
          <ModalFooter>
            <CancelButton onClick={fermer} />
            {entreprises.length ? (
              <SubmitButton pendingLabel="Ajout…">
                <Plus size={14} /> Ajouter
              </SubmitButton>
            ) : null}
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
