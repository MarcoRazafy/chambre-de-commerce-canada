'use client';
import { useEffect, useState } from 'react';
import PublicCard from '@/components/PublicCard';

// Connexion, ou création du premier administrateur si aucun compte n'existe encore
export default function ConnexionPage() {
  const [setup, setSetup] = useState<boolean | null>(null);
  const [v, setV] = useState({ nom: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/auth/setup').then(r => r.json()).then(d => d.error ? setError(d.error) : setSetup(d.needed)).catch(() => setError('Serveur injoignable'));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch(setup ? '/api/auth/setup' : '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) });
    const d = await res.json().catch(() => ({}));
    if (res.ok) window.location.href = d.vers || '/';
    else { setError(d.error || 'Erreur'); setBusy(false); }
  }

  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });
  return (
    <PublicCard sous="CanCham Madagascar · membres et équipe" title={setup ? <>Créer le <em>premier administrateur</em></> : <>Se <em>connecter</em></>}>
      {setup && <p className="small muted">Aucun compte n’existe encore. Ce compte aura tous les droits ; vous pourrez ensuite ajouter l’équipe dans « Équipe & accès ».</p>}
      {error && <div className="err">{error}</div>}
      {setup !== null && (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {setup && <div className="field"><label htmlFor="nom">Nom</label><input id="nom" className="inp" required value={v.nom} onChange={set('nom')} /></div>}
          <div className="field"><label htmlFor="email">Courriel</label><input id="email" type="email" autoComplete="username" className="inp" required value={v.email} onChange={set('email')} /></div>
          <div className="field"><label htmlFor="pw">Mot de passe</label>
            <input id="pw" type="password" autoComplete={setup ? 'new-password' : 'current-password'} minLength={setup ? 8 : undefined} className="inp" required value={v.password} onChange={set('password')} />
            {setup && <span className="hint">8 caractères minimum.</span>}</div>
          <button className="btn cta" disabled={busy} style={{ justifyContent: 'center' }}>{busy ? 'Un instant…' : setup ? 'Créer le compte' : 'Se connecter'}</button>
        </form>
      )}
      {setup === false && <p className="small muted" style={{ textAlign: 'center' }}>Membres de la Chambre et équipe : connectez-vous ici, vous arrivez directement dans votre espace.</p>}
    </PublicCard>
  );
}
