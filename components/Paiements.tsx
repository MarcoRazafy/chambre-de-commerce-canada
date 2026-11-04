'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { RESOURCES } from '@/lib/resources';
import { api, display, total, type Row } from '@/lib/format';
import { downloadCsv, runAction } from '@/lib/ui-actions';
import { toast } from '@/lib/toast';
import Avatar from './Avatar';
import Icon from './Icon';
import ModalBackdrop from './ModalBackdrop';
import StatusBadge from './StatusBadge';
import { EditModal } from './ResourcePage';

const R = RESOURCES.invoices;
const MOYENS = ['MVola', 'Orange Money', 'Airtel Money', 'Virement', 'Espèces', 'Carte bancaire'];
const STATUT: Record<string, string> = { envoyee: 'Envoyée', payee: 'Payée', retard: 'En retard', annulee: 'Annulée' };
const OBJET: Record<string, string> = { cotisation: 'Cotisation', evenement: 'Événement', service: 'Service', autre: 'Autre' };
const OBJET_ICON: Record<string, string> = { cotisation: 'card', evenement: 'cal', service: 'gift', autre: 'file' };
type Filter = '' | 'du' | 'retard' | 'payee' | 'annulee';
const money = (n: number, devise: string) => devise === 'CAD'
  ? `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`
  : `${n.toLocaleString('fr-FR')} Ar`;
const short = (v: string) => new Date(v.slice(0, 10) + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const daysTo = (v: string) => Math.round((new Date(v.slice(0, 10) + 'T12:00').getTime() - new Date(new Date().toDateString() + ' 12:00').getTime()) / 864e5);
// « dans 24 jours », « aujourd'hui », « en retard de 3 jours »
function due(inv: Row) {
  if (inv.statut === 'payee') return { txt: 'Réglée', cls: 'ok' };
  if (inv.statut === 'annulee' || !inv.echeance) return { txt: '', cls: '' };
  const d = daysTo(inv.echeance);
  return d > 0 ? { txt: `dans ${d} jour${d > 1 ? 's' : ''}`, cls: d <= 7 ? 'soon' : '' } : d === 0 ? { txt: 'aujourd’hui', cls: 'soon' } : { txt: `en retard de ${-d} jour${d < -1 ? 's' : ''}`, cls: 'late' };
}
// Totaux par devise, sans additionner ariary et dollars
const sums = (list: Row[]) => ['MGA', 'CAD'].map(dv => [dv, list.filter(i => i.devise === dv).reduce((a, i) => a + total(i.lignes), 0)] as const).filter(([, n]) => n > 0);
const sumText = (list: Row[]) => sums(list).map(([dv, n]) => money(n, dv)).join(' + ') || '0 Ar';

// Choix du mode de règlement, à la place d'une saisie libre
function PayModal({ inv, onClose, onDone }: { inv: Row; onClose: () => void; onDone: () => void }) {
  const [mode, setMode] = useState(inv.mode_paiement ?? '');
  const [busy, setBusy] = useState(false);
  async function confirm() {
    setBusy(true);
    try { toast(await runAction('invoice-paid', { id: inv.id, mode })); onDone(); } catch (e) { toast((e as Error).message, 'error'); setBusy(false); }
  }
  return (
    <ModalBackdrop onClose={onClose}>
      <div className="modal" style={{ width: 'min(100%, 460px)' }} role="dialog" aria-label="Enregistrer le paiement">
        <div className="modal-h"><h2>Enregistrer le paiement</h2><button type="button" className="btn sm ghost" aria-label="Fermer" onClick={onClose}>✕</button></div>
        <div className="modal-b">
          <p className="small muted">Facture <b>{inv.numero}</b> · {money(total(inv.lignes), inv.devise)}. Une cotisation payée met le membre à jour pour un an.</p>
          <div className="pay-modes" role="radiogroup" aria-label="Mode de paiement">
            {MOYENS.map(m => <button key={m} type="button" role="radio" aria-checked={mode === m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>{m}</button>)}
          </div>
        </div>
        <div className="modal-f">
          <button type="button" className="btn" onClick={onClose}>Annuler</button>
          <button type="button" className="btn cta" disabled={busy || !mode} onClick={confirm}>{busy ? 'Enregistrement…' : 'Marquer comme payée'}</button>
        </div>
      </div>
    </ModalBackdrop>
  );
}

// Page Paiements & factures : chiffres clés, filtres, une ligne par facture (membre, objet, montant, échéance, statut, actions)
export default function Paiements() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [members, setMembers] = useState<Record<number, string>>({});
  const [filter, setFilter] = useState<Filter>('');
  const [objet, setObjet] = useState('');
  const [term, setTerm] = useState('');
  const [editing, setEditing] = useState<Row | null>(null);
  const [paying, setPaying] = useState<Row | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => Promise.all([api<Row[]>('/api/invoices'), api<Row[]>('/api/members')])
    .then(([i, m]) => { setRows(i); setMembers(Object.fromEntries(m.map(x => [x.id, x.nom]))); setError(''); })
    .catch(e => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  async function remind(inv: Row) {
    if (!confirm(`Envoyer une relance pour la facture ${inv.numero} ?`)) return;
    try { toast(await runAction('invoice-remind', { id: inv.id })); load(); } catch (e) { setError((e as Error).message); }
  }

  const all = rows ?? [];
  const paid = all.filter(i => i.statut === 'payee'), open = all.filter(i => ['envoyee', 'retard'].includes(i.statut)), late = all.filter(i => i.statut === 'retard');
  const yearAgo = rows ? Date.now() - 365 * 864e5 : 0;   // seulement après le chargement (pas pendant le pré-rendu)
  const issued12 = all.filter(i => i.statut !== 'annulee' && new Date(i.date_emission).getTime() >= yearAgo);
  const rate = issued12.length ? Math.round((issued12.filter(i => i.statut === 'payee').length / issued12.length) * 100) : 0;
  const count = (f: Filter) => all.filter(i => !f || (f === 'du' ? ['envoyee', 'retard'].includes(i.statut) : i.statut === f)).length;
  const shown = all.filter(i => (!filter || (filter === 'du' ? ['envoyee', 'retard'].includes(i.statut) : i.statut === filter))
    && (!objet || i.objet === objet)
    && (!term || [i.numero, members[i.member_id], i.lignes?.[0]?.des].join(' ').toLowerCase().includes(term.toLowerCase())));
  const cols = R.fields.filter(f => f.list);
  const exportCsv = () => downloadCsv(R.title, cols.map(f => f.label), shown.map(i => cols.map(f => display(f, i, { members: Object.entries(members).map(([id, nom]) => ({ id: Number(id), nom })) }, t => RESOURCES[t].label))));

  return (
    <>
      <div className="head page-tools"><div className="actions">
        <Link className="btn" href="/reglements">Règlements annoncés</Link>
        <button className="btn" onClick={exportCsv} disabled={!shown.length}>Exporter</button>
        <button className="btn cta" onClick={() => setEditing({ objet: 'cotisation', devise: 'MGA' })}><Icon name="plus" size={16} /> Nouvelle facture</button>
      </div></div>
      {error && <div className="err">{error}</div>}

      {rows === null ? <div className="card"><div className="skeleton"><span /><span /><span /></div></div> : (
        <>
          <div className="grid g4">
            <div className="card stat mkpi">
              <div className="stat-h"><span className="stat-l">Encaissé</span><span className="stat-ic tile-ic"><Icon name="coin" size={18} fill /></span></div>
              <div className="kpi-v"><span className="stat-v num pay-big">{sumText(paid)}</span></div>
              <span className="stat-s">{paid.length} facture{paid.length > 1 ? 's' : ''} payée{paid.length > 1 ? 's' : ''}</span>
            </div>
            <button type="button" className="card stat mkpi pay-kpi" onClick={() => setFilter('du')}>
              <div className="stat-h"><span className="stat-l">À encaisser</span><span className="stat-ic tile-ic"><Icon name="file" size={18} fill /></span></div>
              <div className="kpi-v"><span className="stat-v num pay-big">{sumText(open)}</span></div>
              <span className="stat-s">{open.length} facture{open.length > 1 ? 's' : ''} en attente de paiement</span>
            </button>
            <button type="button" className="card stat mkpi pay-kpi" onClick={() => setFilter('retard')}>
              <div className="stat-h"><span className="stat-l">En retard</span><span className="stat-ic tile-ic"><Icon name="alert" size={18} fill /></span></div>
              <div className="kpi-v"><span className="stat-v num">{late.length}</span>{late.length > 0 && <span className="kpi-delta down">{sumText(late)}</span>}</div>
              <span className="stat-s">{late.length ? 'à relancer' : 'Aucun retard'}</span>
            </button>
            <div className="card stat mkpi">
              <div className="stat-h"><span className="stat-l">Recouvrement</span><span className="stat-ic tile-ic"><Icon name="ok" size={18} fill /></span></div>
              <div className="kpi-v"><span className="stat-v num">{rate} %</span></div>
              <div className="nl-meter-bar" role="progressbar" aria-label="Taux de recouvrement sur 12 mois" aria-valuenow={rate} aria-valuemin={0} aria-valuemax={100}><span className="green" style={{ width: `${rate}%` }} /></div>
              <span className="stat-s">{issued12.filter(i => i.statut === 'payee').length} payée(s) sur {issued12.length} émise(s) en 12 mois</span>
            </div>
          </div>

          <section className="card sub-card">
            <div className="dir-tools">
              <label className="search-inp dir-search"><Icon name="search" size={16} />
                <input className="inp" placeholder="Rechercher un numéro, un membre, un objet…" aria-label="Rechercher une facture" value={term} onChange={e => setTerm(e.target.value)} /></label>
              <div className="seg" role="group" aria-label="Statut">
                {([['', 'Toutes'], ['du', 'À encaisser'], ['retard', 'En retard'], ['payee', 'Payées'], ['annulee', 'Annulées']] as const).map(([v, l]) =>
                  <button type="button" key={v} className={filter === v ? 'on' : ''} aria-pressed={filter === v} onClick={() => setFilter(v)}>{l} · {count(v)}</button>)}
              </div>
              <select className="inp dir-sector" aria-label="Objet" value={objet} onChange={e => setObjet(e.target.value)}>
                <option value="">Tous les objets</option>
                {Object.entries(OBJET).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>

            {shown.length === 0 ? (
              <div className="empty-state"><b>{all.length ? 'Aucune facture ne correspond' : 'Aucune facture pour le moment'}</b>
                {all.length > 0 && <button className="btn sm" onClick={() => { setFilter(''); setObjet(''); setTerm(''); }}>Voir toutes les factures</button>}</div>
            ) : (
              <ul className="sub-list" aria-label="Factures">
                <li className="inv-row sub-head" aria-hidden="true"><span>Membre</span><span>Objet</span><span className="r">Montant</span><span>Échéance</span><span>Statut</span><span /></li>
                {shown.map(i => {
                  const dd = due(i), unpaid = ['envoyee', 'retard'].includes(i.statut);
                  return (
                    <li key={i.id} className={`inv-row clickable${i.statut === 'retard' ? ' is-late' : ''}`} onClick={() => router.push(`/paiements/${i.id}`)}>
                      <span className="sub-who">
                        <Avatar kind="member" id={i.member_id} size={38} nom={members[i.member_id]} />
                        <span className="sub-id"><b>{members[i.member_id] ?? '—'}</b><Link href={`/paiements/${i.id}`} onClick={e => e.stopPropagation()}>{i.numero}</Link></span>
                      </span>
                      <span className="inv-obj"><span className="sub-src"><Icon name={OBJET_ICON[i.objet] ?? 'file'} size={13} />{OBJET[i.objet] ?? i.objet}</span>
                        {i.lignes?.[0]?.des && <small>{String(i.lignes[0].des).replace(/^(Cotisation annuelle|Participation) — /, '')}</small>}</span>
                      <span className="inv-amt"><b>{money(total(i.lignes), i.devise)}</b><small>émise le {short(i.date_emission)}</small></span>
                      <span className="sub-date"><b>{i.echeance ? short(i.echeance) : '—'}</b>{dd.txt && <small className={`due ${dd.cls}`}>{dd.txt}</small>}</span>
                      <span><StatusBadge value={i.statut} label={STATUT[i.statut] ?? i.statut} /></span>
                      <span className="inv-act" onClick={e => e.stopPropagation()}>
                        {unpaid && <button type="button" className="btn sm cta" onClick={() => setPaying(i)}>Payée</button>}
                        {unpaid && <button type="button" className="btn sm ghost nl-icon" title="Relancer par courriel" aria-label={`Relancer ${i.numero}`} onClick={() => remind(i)}><Icon name="send" size={15} /></button>}
                        <button type="button" className="btn sm ghost nl-icon" title="Modifier" aria-label={`Modifier ${i.numero}`} onClick={() => setEditing(i)}><Icon name="edit" size={15} /></button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
      {paying && <PayModal inv={paying} onClose={() => setPaying(null)} onDone={() => { setPaying(null); load(); }} />}
      {editing && <EditModal table="invoices" row={editing} refs={{ members: Object.entries(members).map(([id, nom]) => ({ id: Number(id), nom })) }} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </>
  );
}
