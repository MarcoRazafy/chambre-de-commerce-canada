'use client';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Icon from './Icon';

export type Onglet = { cle: string; label: string; icon?: string; n?: number; alerte?: boolean; contenu: () => ReactNode };

// Page à onglets de la maquette « Propositions UX » : titre, description, onglets.
// L'onglet ouvert est gardé dans l'adresse (?onglet=…) ; seul son contenu est chargé.
// « entete » : contenu commun à tous les onglets, entre le titre et les onglets (chiffres clés…)
export default function Onglets({ titre, description, onglets, actions, entete }: { titre: string; description?: string; onglets: Onglet[]; actions?: ReactNode; entete?: ReactNode }) {
  const [cur, setCur] = useState(onglets[0].cle);
  const lire = useCallback(() => {
    const o = new URLSearchParams(window.location.search).get('onglet');
    setCur(o && onglets.some(x => x.cle === o) ? o : onglets[0].cle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    lire();
    window.addEventListener('popstate', lire);
    return () => window.removeEventListener('popstate', lire);
  }, [lire]);
  function ouvrir(cle: string) {
    setCur(cle);
    const url = new URL(window.location.href);
    if (cle === onglets[0].cle) url.searchParams.delete('onglet'); else url.searchParams.set('onglet', cle);
    window.history.replaceState(null, '', url);
  }
  const actif = onglets.find(o => o.cle === cur) ?? onglets[0];
  return (
    <>
      <div className="head og-head"><div><h1>{titre}</h1>{description && <p className="muted">{description}</p>}</div>{actions && <div className="actions">{actions}</div>}</div>
      {entete}
      <div className="tabs og-tabs" role="tablist" aria-label={titre}>
        {onglets.map(o => (
          <button key={o.cle} type="button" role="tab" aria-selected={o.cle === actif.cle} className={o.cle === actif.cle ? 'on' : ''} onClick={() => ouvrir(o.cle)}>
            {o.icon && <Icon name={o.icon} size={16} />}{o.label}
            {o.n !== undefined && <span className={`tab-n${o.alerte && o.n > 0 ? ' hot' : ''}`}>{o.n}</span>}
          </button>
        ))}
      </div>
      <div className="og-panel" role="tabpanel" key={actif.cle}>{actif.contenu()}</div>
    </>
  );
}
