"use client";

import { useRef } from "react";
import { FolderOpen, Plus, UserPlus } from "lucide-react";
import { Modal } from "@/components/Modal";
import { ajouterAbonne, importerAbonnes } from "@/lib/actions/newsletter";

const CHAMP = "w-full rounded-[var(--radius-s)] border border-line bg-surface text-ink px-3 py-2.5 text-[13.6px] outline-none focus:border-accent";

// « Importer un CSV » : le fichier choisi part aussitôt
export function ImporterCsv() {
  const formulaire = useRef<HTMLFormElement>(null);
  return (
    <form ref={formulaire} action={importerAbonnes}>
      <label className="btn-contour btn-contour-sm text-ink cursor-pointer" title="Une adresse par ligne ; le reste de la ligne sert de nom">
        <FolderOpen size={15} /> Importer un CSV
        <input
          type="file"
          name="fichier"
          accept=".csv,.txt,text/csv,text/plain"
          className="sr-only"
          onChange={(e) => {
            if (e.currentTarget.files?.length) formulaire.current?.requestSubmit();
          }}
        />
      </label>
    </form>
  );
}

export function AjouterAbonne() {
  return (
    <Modal
      title="Ajouter un abonné"
      trigger={(ouvrir) => (
        <button type="button" onClick={ouvrir} className="btn-action btn-action-sm"><Plus size={15} /> Ajouter un abonné</button>
      )}
    >
      {() => (
        <form action={ajouterAbonne} className="flex flex-col gap-3 p-5">
          <label className="block">
            <span className="block text-[12.5px] font-semibold text-muted mb-1">Nom</span>
            <input name="prenom" maxLength={80} autoComplete="off" className={CHAMP} />
          </label>
          <label className="block">
            <span className="block text-[12.5px] font-semibold text-muted mb-1">Adresse e-mail</span>
            <input name="email" type="email" required autoComplete="off" placeholder="adresse@exemple.com" className={CHAMP} />
          </label>
          <p className="m-0 text-[12.5px] text-muted">Ajoutez seulement une personne qui a accepté de recevoir la lettre.</p>
          <button type="submit" className="btn-action btn-action-sm self-end"><UserPlus size={14} /> Ajouter</button>
        </form>
      )}
    </Modal>
  );
}
