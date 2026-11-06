'use client';
import { useCallback, useEffect, useState } from 'react';
import type { Reponses } from '@/lib/maillage';
import Questionnaire, { type Donnees } from '../maillage/Questionnaire';

// Juste après la connexion : tant que le questionnaire de maillage n'est pas complet, le membre y arrive d'abord,
// en plein écran. « Plus tard » l'emmène dans son espace (avec le menu) ; ses réponses restent enregistrées.
export default function EspaceDemarrage() {
  const [nom, setNom] = useState('');
  const [d, setD] = useState<(Donnees & { pct: number }) | null>(null);
  const [debut, setDebut] = useState(false);
  const espace = () => { window.location.href = '/espace'; };

  useEffect(() => {
    Promise.all([fetch('/api/espace/moi'), fetch('/api/espace/maillage')]).then(async ([a, b]) => {
      if (a.status === 401) { window.location.href = '/connexion'; return; }
      const moi = await a.json(), q = await b.json();
      if (moi.maillage?.pct === 100) { espace(); return; }   // déjà complet : directement l'espace
      setNom(String(moi.nom ?? '').split(/\s+/)[0]); setD(q); setDebut(!!q.maj_le);   // déjà commencé par le membre (pas seulement repris de sa fiche)
    }).catch(espace);
  }, []);
  const enregistrer = useCallback(async (patch: Reponses) => {
    const r = await fetch('/api/espace/maillage', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    const x = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(x.error || 'Enregistrement impossible, vérifiez votre connexion.');
    return x;
  }, []);

  return (
    <div className="mq-page">
      <header className="mq-bandeau es-demarrage-h">
        <img src="/logo-mark.png" alt="" width={30} height={21} />
        <div className="grow"><b>CanCham Madagascar</b><span>Espace membre</span></div>
        <button type="button" className="btn ghost-light" onClick={espace}>Plus tard ›</button>
      </header>
      <main className="mq-corps">
        {!d ? <div className="card"><div className="skeleton"><span /><span /><span /></div></div>
          : !debut ? (
            <div className="card mq-intro">
              <span className="eyebrow">Bienvenue{nom ? `, ${nom}` : ''}</span>
              <h1>Aidez-nous à vous présenter les bons partenaires</h1>
              <p>Avant d’entrer dans votre espace, prenez quelques minutes pour décrire ce que vous offrez et ce que vous cherchez. La Chambre s’en sert pour vous mettre en relation avec les bons membres, y compris des pistes moins évidentes.</p>
              <ul>
                <li><b>15 minutes environ</b> : 16 questions essentielles, en 6 parties.</li>
                <li><b>Enregistrement automatique</b> : vous pouvez vous arrêter à tout moment et reprendre depuis votre espace.</li>
                <li><b>Confidentialité</b> : à la fin, vous choisissez qui peut voir chaque partie de vos réponses.</li>
              </ul>
              <div className="row">
                <button type="button" className="btn cta" onClick={() => setDebut(true)}>Commencer ›</button>
                <button type="button" className="btn" onClick={espace}>Plus tard, aller à mon espace</button>
              </div>
            </div>
          ) : <Questionnaire data={d} enregistrer={enregistrer} mode="membre" onTermine={espace} />}
      </main>
    </div>
  );
}
