'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, money, relative, type Row } from '@/lib/format';
import { toast } from '@/lib/toast';
import Avatar from './Avatar';
import Icon from './Icon';
import ModalBackdrop from './ModalBackdrop';
import SettingsForm from './SettingsForm';
import { EditModal } from './ResourcePage';

const court = (v: string) => new Date(v.slice(0, 10) + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const daysTo = (v: string) => Math.round((new Date(v.slice(0, 10) + 'T12:00').getTime() - new Date(new Date().toDateString() + ' 12:00').getTime()) / 864e5);
const $ = (n: number) => money(n, 'CAD');
type Filtre = 'tous' | 'actifs' | 'off';
type Saas = { base: number; per: number; tps: number; tvq: number };
// Montants d'une facture d'abonnement pour n utilisateurs actifs
const calcul = (s: Saas, n: number) => {
  const sub = s.base + n * s.per, tps = Math.round(sub * s.tps) / 100, tvq = Math.round(sub * s.tvq) / 100;
  return { sub, tps, tvq, tot: sub + tps + tvq };
};

// Facture de l'abonnement, à l'écran puis en PDF (fenêtre d'impression du navigateur)
function FactureAbonnement({ h, s, onClose }: { h: Row; s: Saas & { tpsRate: unknown; tvqRate: unknown; moyen?: string }; onClose: () => void }) {
  const n = Number(h.nb_utilisateurs) || 0, c = calcul(s, n);
  return (
    <ModalBackdrop onClose={onClose}>
      <aside className="drawer wide" role="dialog" aria-label={`Facture ${h.numero}`}>
        <div className="drawer-h"><h2>Facture {h.numero}</h2><button type="button" className="btn sm ghost" aria-label="Fermer" onClick={onClose}>✕</button></div>
        <div className="drawer-b">
          <div className="row"><span className="pchip ok">✓ Payée</span><span className="small muted">{court(h.date_facture)}{s.moyen ? ` · ${s.moyen}` : ''}</span></div>
          <div className="invdoc print-zone">
            <div className="invdoc-top"><div><b>L’Alliée Virtuelle</b><span>Plateforme de gestion pour chambres de commerce</span></div><div className="r"><b className="big">FACTURE</b><span>{h.numero}</span></div></div>
            <div className="invdoc-b">
              <div className="invcols">
                <div><span className="eyebrow">Facturé à</span><b>CanCham Madagascar</b></div>
                <div><span className="eyebrow">Date</span><b>{court(h.date_facture)}</b><span>Formule mensuelle</span></div>
              </div>
              <table className="invtbl"><thead><tr><th>Description</th><th className="r">Montant</th></tr></thead>
                <tbody><tr><td>Forfait</td><td className="r num">{$(s.base)}</td></tr>
                  <tr><td>{n} utilisateur{n > 1 ? 's' : ''} actif{n > 1 ? 's' : ''} × {$(s.per)}</td><td className="r num">{$(n * s.per)}</td></tr></tbody></table>
              <div className="invtot">
                <div><span>Sous-total</span><b className="num">{$(c.sub)}</b></div>
                {c.tps > 0 && <div><span>TPS ({String(s.tpsRate)} %)</span><b className="num">{$(c.tps)}</b></div>}
                {c.tvq > 0 && <div><span>TVQ ({String(s.tvqRate)} %)</span><b className="num">{$(c.tvq)}</b></div>}
                <div><span>Total payé</span><b className="num">{$(Number(h.montant) || c.tot)}</b></div>
              </div>
              <div className="stamp">PAYÉE</div>
            </div>
          </div>
        </div>
        <div className="drawer-f"><span className="grow" /><button type="button" className="btn" onClick={onClose}>Fermer</button>
          <button type="button" className="btn cta" onClick={() => window.print()}><Icon name="download" size={15} /> Télécharger en PDF</button></div>
      </aside>
    </ModalBackdrop>
  );
}

// Abonnement & utilisateurs (maquette « Propositions UX ») : ce que vous payez, les comptes de l'équipe, les factures
export default function AbonnementSummary() {
  const [d, setD] = useState<{ saas: Row; users: Row[]; history: Row[]; moi: number } | null>(null);
  const [reglages, setReglages] = useState(false);
  const [ajout, setAjout] = useState(false);
  const [filtre, setFiltre] = useState<Filtre>('tous');
  const [nouveau, setNouveau] = useState({ nom: '', email: '', fonction: '', role: 'Manager', password: '' });
  const [facture, setFacture] = useState<{ h: Row; imprimer: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [modif, setModif] = useState<Row | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => Promise.all([api<Row>('/api/settings/saas'), api<Row[]>('/api/team_users'), api<Row[]>('/api/platform_invoices'), api<Row>('/api/auth/me')])
    .then(([saas, users, history, me]) => { setD({ saas, users, history, moi: Number(me?.user?.id ?? me?.id) }); setError(''); }).catch(e => setError(e.message)), []);
  useEffect(() => { load(); }, [load, reglages]);
  // « PDF » : la facture s'ouvre puis la fenêtre d'impression
  useEffect(() => { if (facture?.imprimer) { const t = setTimeout(() => window.print(), 350); return () => clearTimeout(t); } }, [facture]);

  async function changer(u: Row, champs: Row, msg: string) {
    try { await api(`/api/team_users/${u.id}`, 'PATCH', champs); toast(msg); load(); } catch (e) { toast((e as Error).message, 'error'); }
  }
  async function creer() {
    setBusy(true);
    try {
      await api('/api/team_users', 'POST', { ...nouveau, nom: nouveau.nom.trim(), email: nouveau.email.trim(), fonction: nouveau.fonction.trim(), actif: true });
      toast(`${nouveau.nom.trim()} peut se connecter. Communiquez-lui son mot de passe provisoire.`);
      setNouveau({ nom: '', email: '', fonction: '', role: 'Manager', password: '' }); setAjout(false); load();
    } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(false); }
  }

  if (!d) return error ? <div className="err">{error}</div> : <div className="card"><div className="skeleton"><span /><span /><span /></div></div>;
  const { saas, users, history, moi } = d;
  const s = { base: Number(saas.base) || 0, per: Number(saas.parUser) || 0, tps: Number(saas.tpsRate) || 0, tvq: Number(saas.tvqRate) || 0 };
  const actifs = users.filter(u => u.actif), n = actifs.length, c = calcul(s, n), apres = calcul(s, n + 1);
  const sansMdp = actifs.filter(u => !u.a_mot_de_passe && u.id !== moi);
  const jamais = actifs.filter(u => !u.derniere_connexion && u.a_mot_de_passe && u.id !== moi);
  const jours = saas.prochaine ? daysTo(saas.prochaine) : null;
  const liste = users.filter(u => filtre === 'tous' || (filtre === 'actifs' ? u.actif : !u.actif))
    .sort((a, b) => Number(b.id === moi) - Number(a.id === moi) || Number(b.actif) - Number(a.actif) || String(b.derniere_connexion ?? '').localeCompare(String(a.derniere_connexion ?? '')));
  const factures = [...history].sort((a, b) => String(b.date_facture).localeCompare(String(a.date_facture)));
  const pret = nouveau.nom.trim() && /\S+@\S+\.\S+/.test(nouveau.email) && nouveau.password.length >= 8;

  return (
    <>
      <div className="head og-head"><div><h1>Abonnement & utilisateurs</h1><p className="muted">Votre formule L’Alliée Virtuelle et les personnes de l’équipe qui ont accès au back-office.</p></div>
        <div className="actions">
          <button className="btn" onClick={() => setReglages(r => !r)}><Icon name="gear" size={16} /> {reglages ? 'Fermer les réglages' : 'Réglages'}</button>
          <button className="btn cta" onClick={() => setAjout(a => !a)}><Icon name="plus" size={16} /> Ajouter un utilisateur</button>
        </div></div>
      {error && <div className="err">{error}</div>}
      {reglages && <SettingsForm cle="saas" />}

      <div className="abo-sum">
        <div className="card abo-box"><span className="eyebrow">Vous payez chaque mois</span><span className="abo-big num">{$(c.tot)}</span>
          <span className="abo-calc"><span>{$(s.base)}<small>forfait</small></span><i>+</i><span>{n} × {$(s.per)}<small>utilisateurs</small></span>
            {c.tps + c.tvq > 0 && <><i>+</i><span>{$(c.tps + c.tvq)}<small>TPS + TVQ</small></span></>}</span></div>
        <div className="card abo-box"><span className="eyebrow">Utilisateurs</span><span className="abo-big num">{n} <small>actif{n > 1 ? 's' : ''}</small></span>
          <span className="small muted">{users.length - n} désactivé{users.length - n > 1 ? 's' : ''} · non facturé{users.length - n > 1 ? 's' : ''}</span>
          <div className="bar"><i style={{ width: `${users.length ? Math.round((n / users.length) * 100) : 0}%` }} /></div></div>
        <div className="card abo-box"><span className="eyebrow">Prochain prélèvement</span>
          <span className="abo-big">{saas.prochaine ? new Date(saas.prochaine.slice(0, 10) + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}</span>
          <span className="small muted">{jours != null && jours >= 0 ? `dans ${jours} jour${jours > 1 ? 's' : ''}` : ''}{saas.moyen ? `${jours != null && jours >= 0 ? ' · ' : ''}${saas.moyen}` : ''}</span>
          <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => setReglages(true)}>Changer de carte</button></div>
      </div>

      {sansMdp.length > 0 && (
        <div className="abo-alert"><Icon name="alert" size={18} />
          <span className="grow"><b>{sansMdp.length} compte{sansMdp.length > 1 ? 's' : ''} sans mot de passe</b> ({sansMdp.slice(0, 3).map(u => u.nom).join(', ')}{sansMdp.length > 3 ? '…' : ''}) : {sansMdp.length > 1 ? 'ces personnes ne peuvent' : 'cette personne ne peut'} pas se connecter. Définissez un mot de passe et communiquez-le.</span>
          <button className="btn sm" onClick={() => setModif(sansMdp[0])}>Définir le mot de passe</button></div>
      )}
      {jamais.length > 0 && (
        <div className="abo-alert"><Icon name="alert" size={18} />
          <span className="grow"><b>{jamais[0].nom} ne s’est jamais connecté{jamais.length > 1 ? ` (et ${jamais.length - 1} autre${jamais.length > 2 ? 's' : ''})` : ''}</b> mais son compte vous coûte {$(s.per)} par mois.</span>
          <button className="btn sm" onClick={() => changer(jamais[0], { actif: false }, `${jamais[0].nom} est désactivé : il n’est plus facturé.`)}>Désactiver ce compte</button></div>
      )}

      {ajout && (
        <div className="card abo-add">
          <div className="row between"><h2>Ajouter un utilisateur</h2><button className="btn sm ghost" onClick={() => setAjout(false)}>Annuler</button></div>
          <div className="grid g4 abo-form">
            <div className="field"><label htmlFor="au-n">Nom complet</label><input className="inp" id="au-n" value={nouveau.nom} onChange={e => setNouveau(v => ({ ...v, nom: e.target.value }))} placeholder="Hasina Rakotomalala" /></div>
            <div className="field"><label htmlFor="au-e">Courriel</label><input className="inp" id="au-e" type="email" value={nouveau.email} onChange={e => setNouveau(v => ({ ...v, email: e.target.value }))} placeholder="prenom@cancham.mg" /></div>
            <div className="field"><label htmlFor="au-f">Fonction</label><input className="inp" id="au-f" value={nouveau.fonction} onChange={e => setNouveau(v => ({ ...v, fonction: e.target.value }))} placeholder="Chargée de projets" /></div>
            <div className="field"><label htmlFor="au-r">Rôle</label><select className="inp" id="au-r" value={nouveau.role} onChange={e => setNouveau(v => ({ ...v, role: e.target.value }))}><option>Manager</option><option>Administrateur</option></select></div>
            <div className="field"><label htmlFor="au-p">Mot de passe provisoire</label><input className="inp" id="au-p" type="text" autoComplete="new-password" value={nouveau.password} onChange={e => setNouveau(v => ({ ...v, password: e.target.value }))} placeholder="8 caractères minimum" /></div>
          </div>
          <div className="row between"><span className="small">Communiquez-lui ce mot de passe ; il pourra le changer dans « Mon profil ». Votre abonnement passe à <b>{$(apres.tot)}</b> par mois <span className="muted">(+{$(apres.tot - c.tot)})</span>.</span>
            <button className="btn green" disabled={busy || !pret} onClick={creer}>{busy ? 'Création…' : 'Créer le compte'}</button></div>
        </div>
      )}

      <div className="card mtbl-card">
        <div className="row between abo-users-h">
          <div className="row" style={{ gap: 6 }}>
            {([['tous', 'Tous', users.length], ['actifs', 'Actifs', n], ['off', 'Désactivés', users.length - n]] as const).map(([k, l, x]) =>
              <button key={k} type="button" className={`fchip${filtre === k ? ' on' : ''}`} aria-pressed={filtre === k} onClick={() => setFiltre(k)}>{l} · {x}</button>)}
          </div>
          <span className="small muted"><b>Administrateur</b> : tout, dont l’équipe et l’abonnement · <b>Manager</b> : tout sauf l’équipe et l’abonnement</span>
        </div>
        <div className="tbl">
          <table className="mtbl abo-table">
            <thead><tr><th>Utilisateur</th><th>Rôle</th><th>Dernière connexion</th><th className="r">Coût / mois</th><th className="r">Accès</th></tr></thead>
            <tbody>
              {liste.map(u => {
                const vous = u.id === moi;
                return (
                  <tr key={u.id} className={u.actif ? '' : 'u-off'}>
                    <td><span className="inv-who"><Avatar kind="user" id={u.id} size={34} nom={u.nom} />
                      <span className="abo-u"><b>{u.nom}{vous && <span className="pchip off">Vous</span>}</b><span className="inv-sub">{[u.email, u.fonction].filter(Boolean).join(' · ')}</span></span></span></td>
                    <td>{vous ? <span className="pchip info">{u.role}</span>
                      : <select className="rolesel" aria-label={`Rôle de ${u.nom}`} value={u.role} disabled={!u.actif} onChange={e => changer(u, { role: e.target.value }, `${u.nom} est maintenant ${e.target.value}.`)}>
                        <option>Manager</option><option>Administrateur</option></select>}</td>
                    <td className={`small${(!u.derniere_connexion || !u.a_mot_de_passe) && u.actif ? ' warnt' : ''}`}>
                      {u.actif && !u.a_mot_de_passe ? <button type="button" className="linkish warnt" onClick={() => setModif(u)} title="Sans mot de passe, ce compte ne peut pas se connecter">⚠ Pas de mot de passe : le définir</button>
                        : u.derniere_connexion ? relative(u.derniere_connexion) : u.actif ? '⚠ Jamais connecté' : '—'}</td>
                    <td className="r small num">{u.actif ? $(s.per) : <span className="muted">—</span>}</td>
                    <td className="r"><span className="inv-btns">{vous ? <span className="small muted">Vous</span>
                      : u.actif ? <button className="btn sm ghost" onClick={() => changer(u, { actif: false }, `${u.nom} est désactivé : il n’est plus facturé.`)}>Désactiver</button>
                        : <button className="btn sm" onClick={() => changer(u, { actif: true }, `${u.nom} a de nouveau accès.`)}>Réactiver</button>}
                      {!vous && <button className="btn sm ghost nl-icon" title="Modifier (nom, courriel, fonction, mot de passe)" aria-label={`Modifier ${u.nom}`} onClick={() => setModif(u)}><Icon name="edit" size={15} /></button>}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mtbl-card">
        <div className="row between abo-users-h"><h2>Factures de l’abonnement</h2><span className="small muted">Prélevées chaque mois{saas.moyen ? ` · ${saas.moyen}` : ''}</span></div>
        {factures.length === 0 ? <p className="small muted">Aucune facture pour le moment.</p> : (
          <div className="tbl">
            <table className="mtbl">
              <thead><tr><th>N°</th><th>Date</th><th>Détail</th><th className="r">Total TTC</th><th>Statut</th><th className="r">Facture</th></tr></thead>
              <tbody>
                {factures.map(h => (
                  <tr key={h.id}>
                    <td className="small num">{h.numero}</td>
                    <td className="small nw">{court(h.date_facture)}</td>
                    <td className="small">{$(s.base)} + {h.nb_utilisateurs} utilisateur{Number(h.nb_utilisateurs) > 1 ? 's' : ''}</td>
                    <td className="r num"><b>{$(Number(h.montant))}</b></td>
                    <td><span className="pchip ok">✓ Payée</span></td>
                    <td className="r"><span className="inv-btns">
                      <button className="btn sm" onClick={() => setFacture({ h, imprimer: false })}><Icon name="eye" size={14} /> Afficher</button>
                      <button className="btn sm" onClick={() => setFacture({ h, imprimer: true })}><Icon name="download" size={14} /> PDF</button></span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modif && <EditModal table="team_users" row={modif} refs={{}} onClose={() => setModif(null)} onSaved={() => { setModif(null); load(); }} />}
      {facture && <FactureAbonnement h={facture.h} s={{ ...s, tpsRate: saas.tpsRate, tvqRate: saas.tvqRate, moyen: saas.moyen }} onClose={() => setFacture(null)} />}
    </>
  );
}
