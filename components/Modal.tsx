"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({
  trigger,
  title,
  children,
  wide = false,
  largeur,
  ouvert: ouvertImpose,
  onFermer,
}: {
  trigger?: (ouvrir: () => void) => ReactNode;
  title: string;
  children: (fermer: () => void) => ReactNode;
  wide?: boolean;
  largeur?: string;
  ouvert?: boolean;
  onFermer?: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [ouvertInterne, setOuvertInterne] = useState(false);
  const pilote = ouvertImpose !== undefined;
  const ouvert = pilote ? ouvertImpose : ouvertInterne;
  const setOuvert = (o: boolean) => {
    if (!pilote) setOuvertInterne(o);
    else if (!o) onFermer?.();
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (ouvert && !el.open) el.showModal();
    if (!ouvert && el.open) el.close();
  }, [ouvert]);

  return (
    <>
      {trigger?.(() => setOuvert(true))}
      <dialog
        ref={ref}
        onClose={(e) => {
          if (e.target === e.currentTarget) setOuvert(false);
        }}
        onCancel={(e) => {
          if (e.target === e.currentTarget) setOuvert(false);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOuvert(false);
        }}
        className={`m-auto w-[calc(100vw-32px)] ${
          largeur ?? (wide ? "max-w-[680px]" : "max-w-[560px]")
        } overflow-hidden rounded-[var(--radius-l)] border border-line bg-surface text-ink p-0 backdrop:bg-black/55 backdrop:backdrop-blur-[2px]`}
      >
        {ouvert ? (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <h3 className="m-0 text-[16.5px] font-semibold font-[family-name:var(--font-display)]">
                {title}
              </h3>
              <button
                type="button"
                onClick={() => setOuvert(false)}
                aria-label="Fermer"
                className="border border-line bg-surface w-9 h-9 rounded-[var(--radius-s)] flex items-center justify-center cursor-pointer text-muted hover:text-ink"
              >
                <X size={15} />
              </button>
            </div>
            <div className="relative max-h-[70vh] overflow-y-auto">
              {children(() => setOuvert(false))}
            </div>
          </>
        ) : null}
      </dialog>
    </>
  );
}
