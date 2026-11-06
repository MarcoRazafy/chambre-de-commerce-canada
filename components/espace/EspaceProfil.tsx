'use client';
import { useEffect, useState } from 'react';
import { toast } from '@/lib/toast';
import Icon from '../Icon';
import { useMoi } from './EspaceShell';

type Obj = Record<string, any>;
async function appel(url: string, method: string, body: unknown) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Enregistrement impossible');
  return d;
}

// « Mon entreprise » : la présentation de l'entreprise, mes coordonnées, l'équipe, mon mot de passe
export default function EspaceProfil() {
  const { recharger } = useMoi();
  const [d, setD] = useState<{ entreprise: Obj; moi: Obj; equipe: Obj[] } | null>(null);
  const [e, setE] = useState<Obj>({});
  const [moi, setMoi] = useState<Obj>({});
  const [mdp, setMdp] = useState({ ancien: '', nouveau: '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch('/api/espace/profil').then(r => r.json()).then(x => { setD(x); setE(x.entreprise); setMoi(x.moi); }).catch(() => {});
  }, []);
  if (!d) return <div className="card"><div className="skeleton"><span /><span /><span /></div></div>;

  const champ = (k: string, label: string, opts: { long?: boolean; large?: boolean; aide?: string; placeholder?: string } = {}) => (
    <div className={`field${opts.long || opts.large ? ' es-large' : ''}`}><label htmlFor={`es-${k}`}>{label}</label>
      {opts.long ? <textarea id={`es-${k}`} className="inp" rows={4} value={e[k] ?? ''} placeholder={opts.placeholder} onChange={x => setE({ ...e, [k]: x.target.value })} />
        : <input id={`es-${k}`} className="inp" value={e[k] ?? ''} placeholder={opts.placeholder} onChange={x => setE({ ...e, [k]: x.target.value })} />}
      {opts.aide && <span className="hint">{opts.aide}</span>}</div>
  );
  async function enregistrer() {
    setBusy(true);
    try {
      const { activite, description, site_web, ville, recherche, statut_juridique } = e;
      await appel('/api/espace/profil', 'PATCH', { entreprise: { activite, description, site_web, ville, recherche, statut_juridique }, moi: { fonction: moi.fonction, tel: moi.tel } });
      toast('Modifications enregistrées.'); recharger();
    } catch (x) { toast((x as Error).message, 'error'); } finally { setBusy(false); }
  }
  async function changerMdp(ev: React.FormEvent) {
    ev.preventDefault();
    try { await appel('/api/espace/mot-de-passe', 'POST', mdp); setMdp({ ancien: '', nouveau: '' }); toast('Mot de passe changé.'); }
    catch (x) { toast((x as Error).message, 'error'); }
  }

  return (
    <>
      <div className="head"><div><h1>Mon entreprise</h1><p className="muted">Ce que les autres membres et la Chambre voient de {d.entreprise.nom}.</p></div>
        <div className="actions"><button className="btn cta" disabled={busy} onClick={enregistrer}><Icon name="ok" size={16} /> {busy ? 'Enregistrement…' : 'Enregistrer'}</button></div></div>

      <div className="grid g21 es-profil">
        <section className="card">
          <h2>Présentation</h2>
          <div className="es-fixe"><span><small>Entreprise</small><b>{d.entreprise.nom}</b></span><span><small>Secteur</small><b>{d.entreprise.secteur ?? '—'}</b></span>
            <span><small>Pays</small><b>{d.entreprise.pays === 'CA' ? 'Canada' : 'Madagascar'}</b></span></div>
          <div className="es-champs">
            {champ('activite', 'Accroche', { placeholder: 'Ce que vous faites, en une phrase', large: true })}
            {champ('description', 'Description', { long: true })}
            {champ('recherche', 'Ce que vous recherchez', { long: true, aide: 'Partenaires, fournisseurs, clients… La Chambre s’en sert pour vous mettre en relation.' })}
            {champ('site_web', 'Site web', { placeholder: 'https://…' })}
            {champ('ville', 'Ville')}
            {champ('statut_juridique', 'Forme juridique', { placeholder: 'SARL, SA, entreprise individuelle…' })}
          </div>
          <p className="small muted">Pour changer le nom, le secteur ou la formule d’adhésion, écrivez à la Chambre.</p>
        </section>

        <div className="es-col">
          <section className="card">
            <h2>Mes coordonnées</h2>
            <div className="es-fixe"><span><small>Nom</small><b>{d.moi.nom}</b></span><span><small>Courriel de connexion</small><b>{d.moi.email}</b></span></div>
            <div className="field"><label htmlFor="es-fonction">Fonction</label><input id="es-fonction" className="inp" value={moi.fonction ?? ''} onChange={x => setMoi({ ...moi, fonction: x.target.value })} /></div>
            <div className="field"><label htmlFor="es-tel">Téléphone</label><input id="es-tel" className="inp" value={moi.tel ?? ''} onChange={x => setMoi({ ...moi, tel: x.target.value })} /></div>
          </section>
          <section className="card">
            <h2>L’équipe de {d.entreprise.nom}</h2>
            <ul className="es-equipe">{d.equipe.map(c => <li key={c.id}><b>{c.nom}</b><small>{[c.fonction, c.principal && 'contact principal'].filter(Boolean).join(' · ') || '—'}</small></li>)}</ul>
          </section>
          <form className="card" onSubmit={changerMdp}>
            <h2>Mot de passe</h2>
            <div className="field"><label htmlFor="es-a">Mot de passe actuel</label><input id="es-a" className="inp" type="password" autoComplete="current-password" value={mdp.ancien} onChange={x => setMdp({ ...mdp, ancien: x.target.value })} /></div>
            <div className="field"><label htmlFor="es-n">Nouveau mot de passe</label><input id="es-n" className="inp" type="password" autoComplete="new-password" placeholder="8 caractères minimum" value={mdp.nouveau} onChange={x => setMdp({ ...mdp, nouveau: x.target.value })} /></div>
            <button className="btn" disabled={!mdp.ancien || mdp.nouveau.length < 8} style={{ alignSelf: 'flex-start' }}>Changer le mot de passe</button>
          </form>
        </div>
      </div>
    </>
  );
}
