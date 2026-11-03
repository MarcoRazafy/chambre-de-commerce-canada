'use client';
import { useEffect, useState } from 'react';
import { toast } from '@/lib/toast';
import PhotoUpload from '@/components/PhotoUpload';

type U = { id: number; nom: string; email: string; role: string; fonction: string | null };

// Mon profil : photo, nom, fonction, mot de passe
export default function ProfilPage() {
  const [u, setU] = useState<U | null>(null);
  const [v, setV] = useState({ nom: '', fonction: '' });
  const [pw, setPw] = useState({ actuel: '', nouveau: '', confirme: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { setU(d.user); setV({ nom: d.user.nom, fonction: d.user.fonction ?? '' }); });
  }, []);

  async function patch(body: object, ok: string) {
    setError('');
    const res = await fetch('/api/profil', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return setError(d.error || 'Erreur');
    toast(ok);
    window.dispatchEvent(new Event('cc:chat'));
    return true;
  }

  if (!u) return <div className="empty">Chargement…</div>;
  return (
    <>
      {error && <div className="err">{error}</div>}
      <div className="grid g21">
        <form className="card" onSubmit={e => { e.preventDefault(); patch(v, 'Profil enregistré.'); }}>
          <h2>Informations</h2>
          <div className="field"><label htmlFor="p-nom">Nom</label><input id="p-nom" className="inp" required value={v.nom} onChange={e => setV({ ...v, nom: e.target.value })} /></div>
          <div className="field"><label htmlFor="p-fn">Fonction</label><input id="p-fn" className="inp" value={v.fonction} onChange={e => setV({ ...v, fonction: e.target.value })} placeholder="Ex. : Trésorier" /></div>
          <dl className="kv"><dt>Courriel</dt><dd>{u.email}</dd><dt>Rôle</dt><dd>{u.role}</dd></dl>
          <div className="row"><button className="btn cta">Enregistrer</button></div>
        </form>
        <div className="card"><h2>Photo de profil</h2><PhotoUpload kind="user" id={u.id} /></div>
      </div>
      <form className="card" style={{ maxWidth: 560 }} onSubmit={async e => {
        e.preventDefault();
        if (pw.nouveau !== pw.confirme) return setError('Les deux nouveaux mots de passe ne sont pas identiques');
        if (await patch({ actuel: pw.actuel, nouveau: pw.nouveau }, 'Mot de passe changé.')) setPw({ actuel: '', nouveau: '', confirme: '' });
      }}>
        <h2>Mot de passe</h2>
        <div className="field"><label htmlFor="p-a">Mot de passe actuel</label><input id="p-a" type="password" autoComplete="current-password" className="inp" required value={pw.actuel} onChange={e => setPw({ ...pw, actuel: e.target.value })} /></div>
        <div className="field"><label htmlFor="p-n">Nouveau mot de passe</label><input id="p-n" type="password" autoComplete="new-password" minLength={8} className="inp" required value={pw.nouveau} onChange={e => setPw({ ...pw, nouveau: e.target.value })} /><span className="hint">8 caractères minimum.</span></div>
        <div className="field"><label htmlFor="p-c">Confirmer</label><input id="p-c" type="password" autoComplete="new-password" className="inp" required value={pw.confirme} onChange={e => setPw({ ...pw, confirme: e.target.value })} /></div>
        <div className="row"><button className="btn cta">Changer le mot de passe</button></div>
      </form>
    </>
  );
}
