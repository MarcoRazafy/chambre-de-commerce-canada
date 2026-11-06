'use client';
import { useEffect, useRef } from 'react';

// Ouvre le formulaire de création d'une page quand on vient du bouton « Créer » de la barre du haut :
// par l'adresse (?nouveau=1, retiré aussitôt) ou, si l'on est déjà sur la page, par l'évènement « cc:nouveau ».
export function useNouveau(ouvrir: () => void, actif = true) {
  const f = useRef(ouvrir);
  f.current = ouvrir;
  useEffect(() => {
    if (!actif) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('nouveau') === '1') {
      url.searchParams.delete('nouveau');
      window.history.replaceState(null, '', url);
      f.current();
    }
    const ecoute = (e: Event) => { if ((e as CustomEvent<string>).detail === window.location.pathname) f.current(); };
    window.addEventListener('cc:nouveau', ecoute);
    return () => window.removeEventListener('cc:nouveau', ecoute);
  }, [actif]);
}
