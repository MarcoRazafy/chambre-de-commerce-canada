'use client';
import { useCallback, useEffect, useState } from 'react';
import { toast } from '@/lib/toast';
import type { Reponses } from '@/lib/maillage';
import Questionnaire, { type Donnees } from '../maillage/Questionnaire';
import { useMoi } from './EspaceShell';

// Le questionnaire de maillage dans l'espace membre (mêmes réponses que le lien personnel envoyé par la Chambre)
export default function EspaceMaillage() {
  const { recharger } = useMoi();
  const [d, setD] = useState<Donnees | null>(null);
  const [erreur, setErreur] = useState('');
  useEffect(() => {
    fetch('/api/espace/maillage').then(async r => { const x = await r.json(); if (!r.ok) throw new Error(x.error); setD(x); }).catch(e => setErreur(e.message));
  }, []);
  const enregistrer = useCallback(async (patch: Reponses) => {
    const r = await fetch('/api/espace/maillage', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    const x = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(x.error || 'Enregistrement impossible, vérifiez votre connexion.');
    return x;
  }, []);
  if (!d) return erreur ? <div className="err">{erreur}</div> : <div className="card"><div className="skeleton"><span /><span /><span /></div></div>;
  return (
    <>
      <div className="head"><div><h1>Questionnaire de maillage</h1>
        <p className="muted">Décrivez ce que vous offrez et ce que vous cherchez : la Chambre vous présentera les bons partenaires. Soyez concret (quantités, lieux, délais) ; vos réponses s’enregistrent au fur et à mesure.</p></div></div>
      <Questionnaire data={d} enregistrer={enregistrer} mode="membre"
        onTermine={() => { recharger(); toast('Merci ! Vos réponses sont enregistrées.'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
    </>
  );
}
