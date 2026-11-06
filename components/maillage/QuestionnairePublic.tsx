'use client';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { Reponses } from '@/lib/maillage';
import Questionnaire, { type Donnees } from './Questionnaire';

// Page du membre : présentation, puis le questionnaire ; à la fin, un merci (il peut revenir avec le même lien)
export default function QuestionnairePublic() {
  const { jeton } = useParams<{ jeton: string }>();
  const [d, setD] = useState<(Donnees & { pct: number }) | null>(null);
  const [erreur, setErreur] = useState('');
  const [debut, setDebut] = useState(false);
  const [fini, setFini] = useState(false);
  const url = `/api/public/maillage/${encodeURIComponent(jeton)}`;

  useEffect(() => {
    fetch(url).then(async r => { const x = await r.json().catch(() => ({})); if (!r.ok) throw new Error(x.error || 'Lien introuvable'); setD(x); setDebut(x.pct > 0); })
      .catch(e => setErreur(e.message));
  }, [url]);
  const enregistrer = useCallback(async (patch: Reponses) => {
    const r = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    const x = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(x.error || 'Enregistrement impossible, vérifiez votre connexion.');
    setD(v => (v ? { ...v, pct: x.pct } : v));
    return x;
  }, [url]);

  return (
    <div className="mq-page">
      <header className="mq-bandeau">
        <img src="/logo-mark.png" alt="" width={30} height={21} />
        <div><b>CanCham Madagascar</b><span>Questionnaire de maillage des membres</span></div>
      </header>
      <main className="mq-corps">
        {erreur ? <div className="card mq-msg"><h1>Lien introuvable</h1><p className="muted">{erreur}</p></div>
          : !d ? <div className="card"><div className="skeleton"><span /><span /><span /></div></div>
          : fini ? (
            <div className="card mq-msg">
              <span className="mq-merci">✓</span>
              <h1>Merci, {d.membre.nom} !</h1>
              <p>{d.pct === 100 ? 'Vos réponses sont enregistrées : vous participez maintenant aux mises en relation proposées par la Chambre.'
                : 'Vos réponses sont enregistrées. Il manque encore quelques questions essentielles pour participer aux mises en relation : revenez quand vous voulez avec le même lien.'}</p>
              <p className="small muted">Vous pouvez modifier vos réponses à tout moment avec ce lien. Gardez-le pour vous : il donne accès à votre questionnaire.</p>
              <button type="button" className="btn" onClick={() => setFini(false)}>Revoir mes réponses</button>
            </div>
          ) : !debut ? (
            <div className="card mq-intro">
              <span className="eyebrow">{d.membre.nom}</span>
              <h1>Aidez-nous à vous présenter les bons partenaires</h1>
              <p>Vos réponses permettent à la Chambre de repérer, parmi ses membres, ceux qui ont besoin de ce que vous offrez, et ceux qui offrent ce que vous cherchez, y compris des pistes moins évidentes.</p>
              <ul>
                <li><b>15 minutes environ</b> : 16 questions essentielles, en 6 parties.</li>
                <li><b>Soyez concret</b> : « un transporteur frigorifique pour 3 tonnes par semaine vers Tamatave » aide plus que « logistique ».</li>
                <li><b>Enregistrement automatique</b> : vous pouvez vous arrêter et revenir plus tard avec ce même lien.</li>
                <li><b>Confidentialité</b> : à la fin, vous choisissez qui peut voir chaque partie de vos réponses.</li>
              </ul>
              <button type="button" className="btn cta" onClick={() => setDebut(true)}>Commencer ›</button>
            </div>
          ) : <Questionnaire data={d} enregistrer={enregistrer} mode="membre" onTermine={() => { setFini(true); window.scrollTo(0, 0); }} />}
      </main>
    </div>
  );
}
