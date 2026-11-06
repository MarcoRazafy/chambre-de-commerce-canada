'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api, type Row } from '@/lib/format';
import { downloadCsv } from '@/lib/ui-actions';
import Avatar from './Avatar';
import Icon from './Icon';
import StatusBadge from './StatusBadge';
import { EditModal } from './ResourcePage';
import { useNouveau } from '@/lib/useNouveau';
import { GestionEtiquettes, PastillesDe, PoserEtiquette, useEtiquettes } from './etiquettes/Etiquettes';

// Onglets de statut, comme dans CanCham Connect
const TABS = [
  ['', 'Tous'], ['a_jour', 'À jour'], ['retard', 'En retard'], ['attente', 'Paiement attendu'], ['demande', 'Demandes'], ['refusee', 'Refusées'],
] as const;
const STATUT: Record<string, string> = { a_jour: 'À jour', retard: 'En retard', attente: 'En attente de paiement', demande: 'Nouvelle demande', refusee: 'Refusée' };
const ACCES: Record<string, [string, string]> = { actif: ['Accès actif', 'on'], lien: ['Lien envoyé', 'wait'], aucun: ['Sans accès', ''] };
const fold = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const money = (n: number, devise: string) => devise === 'CAD' ? `${n.toLocaleString('fr-FR')} $` : `${n.toLocaleString('fr-FR')} Ar`;
const dLong = (v: string) => new Date(v.slice(0, 10) + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
const monthYear = (v: string) => new Date(v.slice(0, 10) + 'T12:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
const cap = (v: string | null) => !v ? '' : (v === v.toUpperCase() || v === v.toLowerCase() ? v.toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase()) : v);

type Situation = { detail: string; urgent?: boolean; action?: string };
// Ce qu'il faut savoir et faire pour chaque membre, selon son statut
function situation(m: Row, f: Row | undefined, invs: Row[]): Situation {
  const due = f?.prix != null ? money(Number(f.prix), f.devise) : null;
  if (m.statut === 'demande') return { detail: `Demande déposée le ${dLong(m.created_at)}${f ? ` · ${f.nom}` : ''}`, action: 'Examiner' };
  if (m.statut === 'refusee') return { detail: `Demande refusée · déposée le ${dLong(m.created_at)}` };
  if (m.statut === 'attente') return { detail: due ? `Approuvée · cotisation attendue : ${due}` : 'Approuvée · formule à choisir avant toute cotisation', action: 'Encaisser' };
  if (m.statut === 'retard') {
    const late = invs.filter(i => i.statut === 'retard' && i.echeance).map(i => i.echeance).sort()[0];
    const n = late ? Math.max(0, Math.floor((Date.now() - new Date(late + 'T00:00').getTime()) / 864e5)) : 0;
    return { detail: n ? `${n} jour${n > 1 ? 's' : ''} de retard${n > 30 ? ' · à relancer d’urgence' : ''}` : 'Cotisation en retard', urgent: n > 30, action: 'Relancer' };
  }
  if (m.renouvellement) {
    const d = Math.round((new Date(m.renouvellement + 'T12:00').getTime() - Date.now()) / 864e5);
    if (d >= 0 && d <= 30) return { detail: `Renouvellement dans ${d} jour${d > 1 ? 's' : ''}` };
  }
  return { detail: m.membre_depuis ? `Membre depuis ${monthYear(m.membre_depuis)}` : 'À jour' };
}

// Gestion des membres : onglets par statut, recherche (nom, secteur, ville, pays), formule, situation et accès de chacun
export default function Membres() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [formules, setFormules] = useState<Record<number, Row>>({});
  const [secteurs, setSecteurs] = useState<Record<number, string>>({});
  const [invoices, setInvoices] = useState<Row[]>([]);
  const [contacts, setContacts] = useState<Row[]>([]);
  const [tab, setTab] = useState('');
  const [term, setTerm] = useState('');
  const [formule, setFormule] = useState('');
  const [adding, setAdding] = useState(false);
  useNouveau(() => setAdding(true));
  const [error, setError] = useState('');
  const [sel, setSel] = useState<number[]>([]);
  const [tag, setTag] = useState('');
  const [poser, setPoser] = useState(false);
  const [gestion, setGestion] = useState(false);
  const { cat, load: loadCat } = useEtiquettes();
  const tagsDe = (id: number) => cat?.posees.membres[id] ?? [];

  const load = useCallback(() => Promise.all(['members', 'formules', 'secteurs', 'invoices', 'contacts'].map(t => api<Row[]>('/api/' + t)))
    .then(([m, f, s, i, c]) => {
      setRows(m); setFormules(Object.fromEntries(f.map(x => [x.id, x]))); setSecteurs(Object.fromEntries(s.map(x => [x.id, x.nom])));
      setInvoices(i); setContacts(c); setError('');
    }).catch(e => setError(e.message)), []);
  useEffect(() => {
    load();
    const t = new URLSearchParams(window.location.search).get('statut');
    if (t && TABS.some(([k]) => k === t)) setTab(t);
  }, [load]);
  function openTab(t: string) {
    setTab(t);
    const url = new URL(window.location.href);
    if (t) url.searchParams.set('statut', t); else url.searchParams.delete('statut');
    window.history.replaceState(null, '', url);
  }

  const all = rows ?? [];
  // Compteurs des onglets : après la recherche et la formule, avant le statut
  const base = all.filter(m => (!formule || String(m.formule_id) === formule) && (!tag || tagsDe(m.id).includes(Number(tag)))
    && (!term || fold([m.nom, secteurs[m.secteur_id], m.ville, m.pays === 'CA' ? 'Canada' : 'Madagascar'].join(' ')).includes(fold(term))));
  const count = (k: string) => base.filter(m => !k || m.statut === k).length;
  const shown = base.filter(m => !tab || m.statut === tab);
  const toutCoche = shown.length > 0 && shown.every(m => sel.includes(m.id));
  const invOf = (id: number) => invoices.filter(i => i.member_id === id);
  const principal = (id: number) => contacts.filter(c => c.member_id === id).sort((a, b) => Number(b.principal) - Number(a.principal) || a.id - b.id)[0];

  function exportCsv() {
    const head = ['Membre', 'Type', 'Secteur', 'Ville', 'Pays', 'Formule', 'Cotisation annuelle', 'Statut', 'Situation', 'Membre depuis', 'Renouvellement', 'Contact principal', 'E-mail', 'Téléphone', 'Site web'];
    downloadCsv(`membres-${new Date().toISOString().slice(0, 10)}`, head, shown.map(m => {
      const f = formules[m.formule_id], c = principal(m.id);
      return [m.nom, m.type_membre === 'physique' ? 'Indépendant' : 'Entreprise', secteurs[m.secteur_id] ?? '', cap(m.ville), m.pays === 'CA' ? 'Canada' : 'Madagascar',
        f?.nom ?? 'À définir', f?.prix != null ? money(Number(f.prix), f.devise) : 'à définir', STATUT[m.statut] ?? m.statut, situation(m, f, invOf(m.id)).detail,
        m.membre_depuis?.slice(0, 10) ?? '', m.renouvellement?.slice(0, 10) ?? '', c?.nom ?? '', c?.email ?? '', c?.tel ?? '', m.site_web ?? ''];
    }));
  }

  return (
    <>
      <div className="head page-tools"><div className="actions">
        <Link className="btn" href="/contacts">Contacts</Link>
        <button className="btn" onClick={() => setGestion(true)} disabled={!cat}><Icon name="tag" size={16} /> Étiquettes</button>
        <button className="btn" onClick={exportCsv} disabled={!shown.length}><Icon name="download" size={16} /> Exporter</button>
        <button className="btn cta" onClick={() => setAdding(true)}><Icon name="plus" size={16} /> Ajouter un membre</button>
      </div></div>
      {error && <div className="err">{error}</div>}

      <div className="tabs" role="tablist" aria-label="Statut des membres">
        {TABS.map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => openTab(k)}>
            {l}<span className={`tab-n${k === 'demande' && count(k) > 0 ? ' hot' : ''}`}>{rows ? count(k) : '…'}</span></button>
        ))}
      </div>

      {rows === null ? <div className="card"><div className="skeleton"><span /><span /><span /></div></div> : (
        <section className="card sub-card">
          <div className="dir-tools">
            <label className="search-inp dir-search"><Icon name="search" size={16} />
              <input className="inp" placeholder="Nom, secteur, ville, pays…" aria-label="Rechercher un membre" value={term} onChange={e => setTerm(e.target.value)} /></label>
            <select className="inp dir-sector" aria-label="Formule" value={formule} onChange={e => setFormule(e.target.value)}>
              <option value="">Toutes les formules</option>
              {Object.values(formules).map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
            </select>
            {cat && cat.etiquettes.length > 0 && (
              <select className="inp dir-sector" aria-label="Étiquette" value={tag} onChange={e => setTag(e.target.value)}>
                <option value="">Toutes les étiquettes</option>
                {cat.etiquettes.map(e => <option key={e.id} value={e.id}>{e.nom} ({e.membres})</option>)}
              </select>
            )}
            {(term || formule || tag) && <button type="button" className="linkish small" onClick={() => { setTerm(''); setFormule(''); setTag(''); }}>Effacer les filtres</button>}
            <span className="small muted dir-count">{shown.length} membre{shown.length > 1 ? 's' : ''}</span>
          </div>

          {sel.length > 0 && (
            <div className="rb-bar sel on">
              <span className="small"><b>{sel.length}</b> membre{sel.length > 1 ? 's' : ''} sélectionné{sel.length > 1 ? 's' : ''}</span>
              <button type="button" className="btn sm cta" disabled={!cat} onClick={() => setPoser(true)}><Icon name="tag" size={14} /> Étiqueter</button>
              <button type="button" className="linkish small" onClick={() => setSel([])}>Désélectionner</button>
            </div>
          )}
          {shown.length === 0 ? <div className="empty-state"><b>Aucun membre ne correspond à ces critères.</b></div> : (
            <ul className="sub-list" aria-label="Membres">
              <li className="mb-row sub-head"><span className="sub-who"><input type="checkbox" className="sub-check" checked={toutCoche} aria-label="Tout sélectionner"
                onChange={() => setSel(toutCoche ? sel.filter(id => !shown.some(m => m.id === id)) : [...new Set([...sel, ...shown.map(m => m.id)])])} />Membre</span><span>Formule</span><span>Situation</span><span>Accès</span><span /></li>
              {shown.map(m => {
                const f = formules[m.formule_id], s = situation(m, f, invOf(m.id)), [accL, accC] = ACCES[m.acces] ?? ACCES.aucun;
                return (
                  <li key={m.id} className={`mb-row clickable${s.urgent ? ' is-late' : ''}`} onClick={() => router.push(`/membres/${m.id}`)}>
                    <span className="sub-who">
                      <input type="checkbox" className="sub-check" checked={sel.includes(m.id)} aria-label={`Sélectionner ${m.nom}`}
                        onClick={e => e.stopPropagation()} onChange={() => setSel(l => (l.includes(m.id) ? l.filter(x => x !== m.id) : [...l, m.id]))} />
                      <Avatar kind="member" id={m.id} size={40} nom={m.nom} />
                      <span className="sub-id"><Link href={`/membres/${m.id}`} onClick={e => e.stopPropagation()} className="mb-name">{m.nom}</Link>
                        <span>{[secteurs[m.secteur_id], cap(m.ville)].filter(Boolean).join(' · ') || '—'}</span><PastillesDe ids={tagsDe(m.id)} cat={cat} /></span>
                    </span>
                    <span className="mb-f"><b>{f?.nom ?? 'Formule à choisir'}</b><small>{f?.prix != null ? `${money(Number(f.prix), f.devise)} / an` : 'Cotisation à définir'}</small></span>
                    <span className="mb-sit"><StatusBadge value={m.statut} label={STATUT[m.statut] ?? m.statut} /><small className={s.urgent ? 'urgent' : ''}>{s.detail}</small></span>
                    <span><span className={`mb-acc ${accC}`}>{accL}</span></span>
                    <span className="mb-go">{s.action ? <span className={`mb-act a-${s.action.toLowerCase()}`}>{s.action}</span> : <span className="muted small">Ouvrir</span>}<Icon name="back" size={14} /></span>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="small muted">L’export reprend la liste affichée (onglet et filtres), au format tableur.</p>
        </section>
      )}
      {gestion && cat && <GestionEtiquettes cat={cat} onClose={() => setGestion(false)} onChanged={loadCat} />}
      {poser && cat && <PoserEtiquette cat={cat} cible="membre" ids={sel} onClose={() => setPoser(false)} onDone={() => { setPoser(false); setSel([]); loadCat(); }} />}
      {adding && <EditModal table="members" row={{ statut: 'attente', pays: 'MG', acces: 'aucun', type_membre: 'morale' }} refs={{ secteurs: Object.entries(secteurs).map(([id, nom]) => ({ id: Number(id), nom })), formules: Object.values(formules) }}
        onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
    </>
  );
}

