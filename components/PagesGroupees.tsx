'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, type Row } from '@/lib/format';
import { toast } from '@/lib/toast';
import Icon from './Icon';
import Onglets from './Onglets';
import Paiements from './Paiements';
import Reglements from './Reglements';
import Newsletter from './Newsletter';
import Abonnes from './Abonnes';
import Calendar from './Calendar';
import ResourcePage from './ResourcePage';
import Bibliotheque from './ressources/Bibliotheque';
import Maillage from './Maillage';
import { GestionEtiquettes, Pastille, useEtiquettes } from './etiquettes/Etiquettes';

// Pages réunies par la maquette « Propositions UX » : une entrée du menu, plusieurs onglets.
// Chaque onglet reprend la page existante, avec toutes ses fonctions.

/* ===== Factures & paiements ===== */
const ETAPES: [cle: string, label: string][] = [['avant30', 'J−30'], ['avant7', 'J−7'], ['apres1', 'J+1'], ['apres7', 'J+7'], ['apres15', 'J+15'], ['apres30', 'J+30']];
function Relances() {
  const [r, setR] = useState<Row | null>(null);
  useEffect(() => { api<Row>('/api/settings/relances').then(setR).catch(() => setR({})); }, []);
  if (!r) return <div className="card"><div className="skeleton"><span /><span /></div></div>;
  return (
    <section className="card">
      <div className="card-h"><h2>Calendrier des relances</h2><Link className="btn sm" href="/facturation"><Icon name="gear" size={14} /> Modifier</Link></div>
      <div className="steps" aria-label="Relances actives">
        {ETAPES.map(([k, l]) => <span key={k} className={r[k] ? 'on' : ''} title={r[k] ? 'Relance envoyée' : 'Relance désactivée'}>{l}</span>)}
      </div>
      <p className="small muted">Par rapport à l’échéance de la facture. Envoyées {[r.courriel && 'par courriel', r.notif && 'par notification'].filter(Boolean).join(' et ') || '— aucun canal actif'}
        {r.autoRetard ? ' ; la facture passe « en retard » automatiquement à l’échéance.' : '.'}</p>
    </section>
  );
}

export function FacturesPaiements() {
  const [n, setN] = useState<number | undefined>(undefined);
  useEffect(() => { api<Row[]>('/api/reglements').then(l => setN(l.filter(x => x.statut === 'annoncé').length)).catch(() => {}); }, []);
  return (
    <Onglets titre="Factures & paiements" description="Factures, règlements annoncés par les membres et relances automatiques." onglets={[
      { cle: 'factures', label: 'Factures', icon: 'file', contenu: () => <Paiements /> },
      { cle: 'reglements', label: 'Règlements à vérifier', icon: 'coin', n, alerte: true, contenu: () => <Reglements /> },
      { cle: 'relances', label: 'Relances', icon: 'bell', contenu: () => <Relances /> },
    ]} />
  );
}

/* ===== Newsletter ===== */
export function EtiquettesOnglet() {
  const { cat, load } = useEtiquettes();
  const [gestion, setGestion] = useState(false);
  if (!cat) return <div className="card"><div className="skeleton"><span /><span /></div></div>;
  return (
    <section className="card">
      <div className="card-h"><div><h2>Étiquettes</h2><p className="small muted">Classez membres et abonnés pour leur écrire en un clic. Posez-les depuis les listes Membres et Abonnés.</p></div>
        <button className="btn cta" onClick={() => setGestion(true)}><Icon name="plus" size={16} /> Créer ou modifier</button></div>
      {cat.etiquettes.length ? (
        <ul className="sub-list etq-table">
          <li className="sub-head"><span>Étiquette</span><span>Membres</span><span>Abonnés</span></li>
          {cat.etiquettes.map(e => <li key={e.id}><span><Pastille nom={e.nom} couleur={e.couleur} /></span><span className="num">{e.membres}</span><span className="num">{e.abonnes}</span></li>)}
        </ul>
      ) : <p className="small muted">Aucune étiquette pour le moment.</p>}
      <p className="small muted">S’y ajoutent les étiquettes automatiques (pays, secteur, cotisation, formule, événement, source d’inscription), proposées au moment de choisir les destinataires d’une lettre.</p>
      {gestion && <GestionEtiquettes cat={cat} onClose={() => setGestion(false)} onChanged={load} />}
    </section>
  );
}

function FormulairePublic() {
  const [url, setUrl] = useState('');
  useEffect(() => setUrl(`${window.location.origin}/inscription`), []);
  return (
    <section className="card">
      <h2>Formulaire d’inscription public</h2>
      <p className="small muted">À partager par lien ou à intégrer sur le site de la chambre. Chaque inscription arrive dans « Abonnés », avec la source « Page publique ».</p>
      <div className="row">
        <input className="inp grow" readOnly value={url} aria-label="Lien du formulaire" onFocus={e => e.target.select()} />
        <button className="btn" onClick={() => navigator.clipboard?.writeText(url).then(() => toast('Lien copié.'), () => toast(url))}><Icon name="copy" size={15} /> Copier le lien</button>
        <a className="btn" href="/inscription" target="_blank" rel="noopener"><Icon name="external" size={15} /> Ouvrir</a>
      </div>
    </section>
  );
}

export function NewsletterGroupe() {
  return (
    <Onglets titre="Newsletter" description="Les lettres, leurs destinataires et les personnes abonnées." onglets={[
      { cle: 'lettres', label: 'Lettres', icon: 'mail', contenu: () => <Newsletter /> },
      { cle: 'abonnes', label: 'Abonnés', icon: 'list', contenu: () => <Abonnes /> },
      { cle: 'envois', label: 'Envois programmés', icon: 'send', contenu: () => <ResourcePage table="outbox" /> },
      { cle: 'formulaire', label: 'Formulaire public', icon: 'external', contenu: () => <FormulairePublic /> },
    ]} />
  );
}

/* ===== Agenda & rendez-vous ===== */
export function RendezVousGroupe() {
  return (
    <Onglets titre="Agenda & rendez-vous" description="Le calendrier de la chambre, les rendez-vous avec les membres et les types de rendez-vous proposés." onglets={[
      { cle: 'agenda', label: 'Agenda', icon: 'agenda', contenu: () => <Calendar /> },
      { cle: 'rdv', label: 'Rendez-vous', icon: 'clock', contenu: () => <ResourcePage table="rendez_vous" /> },
      { cle: 'types', label: 'Types de rendez-vous', icon: 'list', contenu: () => <ResourcePage table="rdv_types" /> },
    ]} />
  );
}

/* ===== Ressources & services ===== */
export function RessourcesGroupe() {
  return (
    <Onglets titre="Ressources & services" description="Documents, guides et pages partagés avec les membres, et services proposés par la chambre." onglets={[
      { cle: 'ressources', label: 'Ressources', icon: 'folder', contenu: () => <Bibliotheque /> },
      { cle: 'services', label: 'Services CanCham', icon: 'gift', contenu: () => <ResourcePage table="services" /> },
    ]} />
  );
}

/* ===== Mises en relation ===== */
export function MisesEnRelation() {
  const [n, setN] = useState<number | undefined>(undefined);
  return (
    <Onglets titre="Mises en relation" description="Des rapprochements entre membres, seulement quand l’un a exprimé un besoin que l’autre propose." onglets={[
      { cle: 'suggestions', label: 'Suggestions', icon: 'spark', n, contenu: () => <Maillage onCount={setN} /> },
      { cle: 'envoyees', label: 'Envoyées et écartées', icon: 'send', contenu: () => <ResourcePage table="connections" /> },
    ]} actions={<Link className="btn" href="/annuaire"><Icon name="book" size={16} /> Annuaire</Link>} />
  );
}
