'use client';
import { useEffect, useRef, useState } from 'react';

// Document Word (.docx) mis en page directement dans l'écran : le navigateur ne sait pas l'afficher seul.
// La bibliothèque docx-preview n'est chargée qu'à l'ouverture d'un document.
export default function DocxApercu({ url }: { url: string }) {
  const zone = useRef<HTMLDivElement>(null);
  const [etat, setEtat] = useState<'chargement' | 'pret' | 'erreur'>('chargement');
  useEffect(() => {
    let fini = false;
    setEtat('chargement');
    (async () => {
      try {
        const [{ renderAsync }, res] = await Promise.all([import('docx-preview'), fetch(url)]);
        if (!res.ok) throw new Error(String(res.status));
        const contenu = await res.arrayBuffer();
        if (fini || !zone.current) return;
        zone.current.replaceChildren();
        await renderAsync(contenu, zone.current, undefined, { className: 'docx', inWrapper: true, ignoreLastRenderedPageBreak: true, breakPages: true, experimental: true });
        if (!fini) setEtat('pret');
      } catch { if (!fini) setEtat('erreur'); }
    })();
    return () => { fini = true; };
  }, [url]);
  return (
    <div className="dx">
      {etat === 'chargement' && <p className="dx-msg">Mise en page du document…</p>}
      {etat === 'erreur' && <p className="dx-msg">Ce document ne peut pas être affiché ici. Téléchargez-le pour l’ouvrir.</p>}
      <div ref={zone} className="dx-pages" hidden={etat === 'erreur'} />
    </div>
  );
}
