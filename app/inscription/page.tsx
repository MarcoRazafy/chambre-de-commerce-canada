'use client';
import { useState } from 'react';
import PublicCard from '@/components/PublicCard';

// Formulaire public d'inscription à la lettre d'information (lien à mettre sur le site de la Chambre)
export default function InscriptionPage() {
  const [v, setV] = useState({ nom: '', email: '', site: '' });
  const [state, setState] = useState<'' | 'ok' | string>('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/public/abonnement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) });
    const d = await res.json().catch(() => ({}));
    setState(res.ok ? 'ok' : d.error || 'Erreur');
  }

  return (
    <PublicCard title={<>La lettre <em>CanCham</em></>}>
      {state === 'ok' ? <p>Merci ! Votre inscription est enregistrée.</p> : (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p className="small muted">Recevez chaque mois les actualités, événements et opportunités d’affaires entre le Canada et Madagascar.</p>
          {state && <div className="err">{state}</div>}
          <div className="field"><label htmlFor="nom">Nom</label><input id="nom" className="inp" value={v.nom} onChange={e => setV({ ...v, nom: e.target.value })} /></div>
          <div className="field"><label htmlFor="email">Courriel *</label><input id="email" type="email" className="inp" required value={v.email} onChange={e => setV({ ...v, email: e.target.value })} /></div>
          <input type="text" name="site" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: -9999 }} value={v.site} onChange={e => setV({ ...v, site: e.target.value })} />
          <button className="btn cta" style={{ justifyContent: 'center' }}>S’inscrire</button>
        </form>
      )}
    </PublicCard>
  );
}
