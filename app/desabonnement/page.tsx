'use client';
import { useState } from 'react';
import PublicCard from '@/components/PublicCard';

// Lien présent en bas de chaque lettre : /desabonnement?t=<jeton>
export default function DesabonnementPage() {
  const [state, setState] = useState('');

  async function confirm() {
    const t = new URLSearchParams(window.location.search).get('t');
    const res = await fetch('/api/public/desabonnement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t }) });
    const d = await res.json().catch(() => ({}));
    setState(res.ok ? 'ok' : d.error || 'Erreur');
  }

  return (
    <PublicCard title={<>Se <em>désabonner</em></>}>
      {state === 'ok' ? <p>C’est fait : vous ne recevrez plus la lettre d’information.</p> : (
        <>
          <p className="small muted">Vous ne recevrez plus la lettre d’information de la Chambre.</p>
          {state && <div className="err">{state}</div>}
          <button className="btn cta" onClick={confirm} style={{ justifyContent: 'center' }}>Confirmer le désabonnement</button>
        </>
      )}
    </PublicCard>
  );
}
