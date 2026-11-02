'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Fond des fenêtres (formulaires, mise en relation…) : rendu directement dans <body> pour couvrir toute la page,
// menu et barre du haut compris, avec un flou au lieu d'une ombre. Échap ou un clic à côté referme.
export default function ModalBackdrop({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    setMounted(true);
    document.body.classList.add('modal-open');
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && close.current();
    window.addEventListener('keydown', esc);
    return () => { document.body.classList.remove('modal-open'); window.removeEventListener('keydown', esc); };
  }, []);

  if (!mounted) return null;
  return createPortal(
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && close.current()}>{children}</div>,
    document.body,
  );
}
