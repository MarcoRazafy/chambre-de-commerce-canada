"use client";

import { ExternalLink, Link2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { BoutonCopierLien } from "@/components/rendezvous/Reglages";

// « Liens membres » (page Membres) : le lien pour devenir membre et celui de la connexion des membres, à partager
export function LiensMembres({ adhesion, connexion }: { adhesion: string; connexion: string }) {
  return (
    <Modal
      title="Liens membres"
      trigger={(ouvrir) => (
        <button type="button" onClick={ouvrir} className="btn-contour btn-contour-sm text-ink hover:bg-surface-2">
          <Link2 size={14} /> Liens membres
        </button>
      )}
    >
      {() => (
        <div className="flex flex-col gap-6 px-5 py-5">
          {[
            { titre: "Devenir membre", lien: adhesion },
            { titre: "Connexion des membres", lien: connexion },
          ].map((l) => (
            <section key={l.titre} className="flex flex-col gap-2.5">
              <h3 className="m-0 text-[15px] text-ink">{l.titre}</h3>
              <code className="block rounded-[var(--radius-s)] border border-line bg-surface-2 px-3 py-2.5 text-[13px] break-all">{l.lien}</code>
              <div className="flex flex-wrap gap-2">
                <a href={l.lien} target="_blank" rel="noopener noreferrer" className="btn-action btn-action-sm no-underline"><ExternalLink size={14} /> Ouvrir</a>
                <BoutonCopierLien lien={l.lien} libelle="Copier le lien" />
              </div>
            </section>
          ))}
        </div>
      )}
    </Modal>
  );
}
