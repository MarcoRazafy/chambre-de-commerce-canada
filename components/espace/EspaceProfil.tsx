'use client';
import { useEffect, useState } from 'react';
import { toast } from '@/lib/toast';
import Link from 'next/link';
import Icon from '../Icon';
import MembreHero from '../MembreHero';
import ModalBackdrop from '../ModalBackdrop';
import { useMoi } from './EspaceShell';
import Contacts from '../details/member/Contacts';
import Produits from '../details/member/Produits';

type Obj = Record<string, any>;
async function appel(url: string, method: string, body: unknown) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Enregistrement impossible');
  return d;
}
const date = (v?: string | null) => (v ? new Date(String(v).slice(0, 10) + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');
const STATUT: Record<string, [string, string]> = { a_jour: ['ok', '✓ À jour'], retard: ['late', 'Cotisation en retard'] };

// « Modifier » : la présentation de l'entreprise et mes coordonnées, comme la fenêtre de la fiche de l'équipe
function Modifier({ d, onClose, onDone }: { d: { entreprise: Obj; moi: Obj }; onClose: () => void; onDone: () => void }) {
  const [e, setE] = useState<Obj>(d.entreprise);
  const [moi, setMoi] = useState<Obj>(d.moi);
  const [busy, setBusy] = useState(false);
  const champ = (k: string, label: string, opts: { long?: boolean; large?: boolean; aide?: string; placeholder?: string } = {}) => (
    <div className={`field${opts.long || opts.large ? ' es-large' : ''}`}><label htmlFor={`es-${k}`}>{label}</label>
      {opts.long ? <textarea id={`es-${k}`} className="inp" rows={4} value={e[k] ?? ''} placeholder={opts.placeholder} onChange={x => setE({ ...e, [k]: x.target.value })} />
        : <input id={`es-${k}`} className="inp" value={e[k] ?? ''} placeholder={opts.placeholder} onChange={x => setE({ ...e, [k]: x.target.value })} />}
      {opts.aide && <span className="hint">{opts.aide}</span>}</div>
  );
  async function enregistrer(ev: React.FormEvent) {
    ev.preventDefault();
    setBusy(true);
    try {
      const { activite, description, site_web, ville, recherche, statut_juridique } = e;
      await appel('/api/espace/profil', 'PATCH', { entreprise: { activite, description, site_web, ville, recherche, statut_juridique }, moi: { fonction: moi.fonction, tel: moi.tel } });
      toast('Modifications enregistrées.'); onDone();
    } catch (x) { toast((x as Error).message, 'error'); setBusy(false); }
  }
  return (
    <ModalBackdrop onClose={onClose}>
      <form className="modal" style={{ width: 'min(100%, 680px)' }} role="dialog" aria-label="Modifier mon entreprise" onSubmit={enregistrer}>
        <div className="modal-h"><h2>Modifier {d.entreprise.nom}</h2><button type="button" className="btn sm ghost" aria-label="Fermer" onClick={onClose}>✕</button></div>
        <div className="modal-b">
          <h3 className="es-modal-t">Présentation de l’entreprise</h3>
          <div className="es-champs">
            {champ('activite', 'Accroche', { placeholder: 'Ce que vous faites, en une phrase', large: true })}
            {champ('description', 'Description', { long: true })}
            {champ('recherche', 'Ce que vous recherchez', { long: true, aide: 'Partenaires, fournisseurs, clients… La Chambre s’en sert pour vous mettre en relation.' })}
            {champ('site_web', 'Site web', { placeholder: 'https://…' })}
            {champ('ville', 'Ville')}
            {champ('statut_juridique', 'Forme juridique', { placeholder: 'SARL, SA, entreprise individuelle…' })}
          </div>
          <h3 className="es-modal-t">Mes coordonnées</h3>
          <div className="es-champs">
            <div className="field"><label htmlFor="es-fonction">Fonction</label><input id="es-fonction" className="inp" value={moi.fonction ?? ''} onChange={x => setMoi({ ...moi, fonction: x.target.value })} /></div>
            <div className="field"><label htmlFor="es-tel">Téléphone</label><input id="es-tel" className="inp" value={moi.tel ?? ''} onChange={x => setMoi({ ...moi, tel: x.target.value })} /></div>
          </div>
          <p className="small muted">Pour changer le nom, le secteur ou la formule d’adhésion, écrivez à la Chambre.</p>
        </div>
        <div className="modal-f"><button type="button" className="btn" onClick={onClose}>Annuler</button>
          <button className="btn cta" disabled={busy}><Icon name="ok" size={16} /> {busy ? 'Enregistrement…' : 'Enregistrer'}</button></div>
      </form>
    </ModalBackdrop>
  );
}

function MotDePasse({ onClose }: { onClose: () => void }) {
  const [mdp, setMdp] = useState({ ancien: '', nouveau: '' });
  const [busy, setBusy] = useState(false);
  async function changer(ev: React.FormEvent) {
    ev.preventDefault();
    setBusy(true);
    try { await appel('/api/espace/mot-de-passe', 'POST', mdp); toast('Mot de passe changé.'); onClose(); }
    catch (x) { toast((x as Error).message, 'error'); setBusy(false); }
  }
  return (
    <ModalBackdrop onClose={onClose}>
      <form className="modal" style={{ width: 'min(100%, 440px)' }} role="dialog" aria-label="Changer le mot de passe" onSubmit={changer}>
        <div className="modal-h"><h2>Changer le mot de passe</h2><button type="button" className="btn sm ghost" aria-label="Fermer" onClick={onClose}>✕</button></div>
        <div className="modal-b">
          <div className="field"><label htmlFor="es-a">Mot de passe actuel</label><input id="es-a" className="inp" type="password" autoComplete="current-password" value={mdp.ancien} onChange={x => setMdp({ ...mdp, ancien: x.target.value })} /></div>
          <div className="field"><label htmlFor="es-n">Nouveau mot de passe</label><input id="es-n" className="inp" type="password" autoComplete="new-password" placeholder="8 caractères minimum" value={mdp.nouveau} onChange={x => setMdp({ ...mdp, nouveau: x.target.value })} /></div>
        </div>
        <div className="modal-f"><button type="button" className="btn" onClick={onClose}>Annuler</button>
          <button className="btn cta" disabled={busy || !mdp.ancien || mdp.nouveau.length < 8}>{busy ? 'Changement…' : 'Changer le mot de passe'}</button></div>
      </form>
    </ModalBackdrop>
  );
}

// « Mon entreprise » : la même fiche que celle de l'équipe (en-tête, présentation, catalogue), avec « Modifier »
export default function EspaceProfil() {
  const { recharger } = useMoi();
  const [d, setD] = useState<{ entreprise: Obj; moi: Obj } | null>(null);
  const [fenetre, setFenetre] = useState<'modifier' | 'mdp' | null>(null);
  const charger = () => fetch('/api/espace/profil').then(r => r.json()).then(setD).catch(() => {});
  useEffect(() => { charger(); }, []);
  if (!d) return <div className="card"><div className="skeleton"><span /><span /><span /></div></div>;
  const m = d.entreprise;
  const [ton, libelle] = STATUT[m.statut] ?? ['warn', 'Cotisation attendue'];
  const offres: string[] = m.offres ?? [], besoins: string[] = m.besoins ?? [];

  return (
    <>
      <MembreHero m={m} secteur={m.secteur} editable onChange={charger}
        badges={<span className={`pchip ${ton}`}>{libelle}</span>}
        onCadrage={async (x, y) => { try { await appel('/api/espace/profil', 'PATCH', { entreprise: { couverture_x: x, couverture_y: y } }); toast('Cadrage enregistré.'); charger(); } catch (z) { toast((z as Error).message, 'error'); } }}
        actions={<><Link className="btn" href={`/espace/annuaire/${m.id}`}><Icon name="eye" size={16} /> Voir dans l’annuaire</Link>
          <button type="button" className="btn cta" onClick={() => setFenetre('modifier')}><Icon name="edit" size={16} /> Modifier</button></>} />

      <div className="mdetail">
        <div className="mdetail-main">
          <section className="card">
            <h2>Présentation</h2>
            {m.activite && <p className="mabout-lead">{m.activite}</p>}
            {m.description && m.description !== m.activite && <p className="mabout-text">{m.description}</p>}
            {!m.activite && !m.description && <p className="small muted">Pas encore de présentation. « Modifier » permet de la rédiger : c’est ce que les autres membres lisent dans l’annuaire.</p>}
            <div className="mabout-block">
              <h3>Recherche actuellement</h3>
              {besoins.length > 0 && <ul className="mneeds">{besoins.map(t => <li key={t}>{t}</li>)}</ul>}
              {m.recherche ? <p className="mabout-text">{m.recherche}</p> : besoins.length === 0 && <p className="small muted">Rien d’indiqué. Dites ce que vous cherchez : la Chambre s’en sert pour vous présenter des partenaires.</p>}
            </div>
          </section>

          <Produits espace />
          <Contacts espace moi={d.moi.id} />

          {(offres.length > 0 || besoins.length > 0) && (
            <section className="card">
              <h2>Propose &amp; recherche</h2>
              <div className="mtags">
                {offres.length > 0 && <div><span className="dcard-k">Propose</span><div className="mtags-list">{offres.map(t => <span key={t} className="dchip">{t}</span>)}</div></div>}
                {besoins.length > 0 && <div><span className="dcard-k">Recherche</span><div className="mtags-list">{besoins.map(t => <span key={t} className="dchip need">{t}</span>)}</div></div>}
              </div>
            </section>
          )}
        </div>

        <aside className="mdetail-side">
          <section className="card">
            <h2>Mon adhésion</h2>
            <dl className="kv mkv">
              <dt>Formule</dt><dd>{m.formule ?? '—'}</dd>
              <dt>Cotisation</dt><dd><span className={`pchip ${ton}`}>{libelle}</span></dd>
              <dt>Membre depuis</dt><dd>{date(m.membre_depuis)}</dd>
              <dt>Renouvellement</dt><dd>{date(m.renouvellement)}</dd>
              <dt>Forme juridique</dt><dd>{m.statut_juridique || '—'}</dd>
            </dl>
            <Link className="btn sm" style={{ alignSelf: 'flex-start' }} href="/espace/factures"><Icon name="doc" size={14} /> Mes factures</Link>
          </section>
          <section className="card">
            <div className="row between"><h2>Mes coordonnées</h2><button type="button" className="btn sm ghost" onClick={() => setFenetre('modifier')}><Icon name="edit" size={14} /> Modifier</button></div>
            <dl className="kv mkv">
              <dt>Nom</dt><dd>{d.moi.nom}</dd>
              <dt>Fonction</dt><dd>{d.moi.fonction || '—'}</dd>
              <dt>Courriel</dt><dd>{d.moi.email}</dd>
              <dt>Téléphone</dt><dd>{d.moi.tel || '—'}</dd>
            </dl>
            <button type="button" className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => setFenetre('mdp')}><Icon name="lock" size={14} /> Changer le mot de passe</button>
          </section>
        </aside>
      </div>

      {fenetre === 'modifier' && <Modifier d={d} onClose={() => setFenetre(null)} onDone={() => { setFenetre(null); charger(); recharger(); }} />}
      {fenetre === 'mdp' && <MotDePasse onClose={() => setFenetre(null)} />}
    </>
  );
}
