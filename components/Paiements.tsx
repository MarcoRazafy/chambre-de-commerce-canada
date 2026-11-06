'use client';
import Link from 'next/link';
import { Pager, usePage } from './Pagination';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { RESOURCES } from '@/lib/resources';
import { api, display, total, type Row } from '@/lib/format';
import { downloadCsv, runAction } from '@/lib/ui-actions';
import { toast } from '@/lib/toast';
import Avatar from './Avatar';
import Icon from './Icon';
import ModalBackdrop from './ModalBackdrop';
import { EditModal } from './ResourcePage';

const R = RESOURCES.invoices;
const MOYENS = ['MVola', 'Orange Money', 'Airtel Money', 'Virement', 'Espèces', 'Carte bancaire'];
const STATUT: Record<string, string> = { envoyee: 'Envoyée', payee: 'Payée', retard: 'En retard', annulee: 'Annulée' };
const PCHIP: Record<string, string> = { payee: 'ok', retard: 'late', envoyee: 'warn', annulee: 'off' };
const OBJET: Record<string, string> = { cotisation: 'Cotisation', evenement: 'Événement', service: 'Service', autre: 'Autre' };
export type Filter = '' | 'du' | 'retard' | 'payee' | 'annulee';
const money = (n: number, devise: string) => devise === 'CAD'
  ? `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`
  : `${n.toLocaleString('fr-FR')} Ar`;
// « 28 nov. » cette année, « 28 nov. 2025 » sinon
const court = (v: string) => new Date(v.slice(0, 10) + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', ...(v.slice(0, 4) === String(new Date().getFullYear()) ? {} : { year: 'numeric' }) });
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
// Chiffre clé : la devise principale en grand, l'autre en dessous (« + 300,00 $ · 27 factures payées »)
const deux = (list: Row[], quoi = ''): [string, string] => {
  const [a, ...b] = sums(list);
  const n = `${list.length} facture${list.length > 1 ? 's' : ''}${quoi ? ` ${quoi}${list.length > 1 ? 's' : ''}` : ''}`;
  return [a ? money(a[1], a[0]) : '0 Ar', [...b.map(([dv, x]) => '+ ' + money(x, dv)), n].join(' · ')];
};

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

// Données des factures, partagées par les chiffres clés, les onglets et l'export
export type Factures = { rows: Row[] | null; members: Record<number, string>; load: () => void; error: string };
export function useFactures(): Factures {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [members, setMembers] = useState<Record<number, string>>({});
  const [error, setError] = useState('');
  const load = useCallback(() => { Promise.all([api<Row[]>('/api/invoices'), api<Row[]>('/api/members')])
    .then(([i, m]) => { setRows(i); setMembers(Object.fromEntries(m.map(x => [x.id, x.nom]))); setError(''); })
    .catch(e => setError(e.message)); }, []);
  useEffect(() => { load(); }, [load]);
  return { rows, members, load, error };
}
const refsDe = (members: Record<number, string>) => ({ members: Object.entries(members).map(([id, nom]) => ({ id: Number(id), nom })) });
export const exporterFactures = ({ rows, members }: Factures) => {
  const cols = R.fields.filter(f => f.list);
  downloadCsv(R.title, cols.map(f => f.label), (rows ?? []).map(i => cols.map(f => display(f, i, refsDe(members), t => RESOURCES[t].label))));
};
export function NouvelleFacture({ f, row, onClose }: { f: Factures; row: Row; onClose: () => void }) {
  return <EditModal table="invoices" row={row} refs={refsDe(f.members)} onClose={onClose} onSaved={() => { onClose(); f.load(); }} />;
}

// Chiffres clés de la maquette : Encaissé, À encaisser, En retard, Recouvrement sur 12 mois
export function FacturesKpis({ rows }: { rows: Row[] | null }) {
  if (!rows) return <div className="grid g4">{[0, 1, 2, 3].map(k => <div key={k} className="card kpi4 static"><div className="skeleton"><span /><span /></div></div>)}</div>;
  const paid = rows.filter(i => i.statut === 'payee'), open = rows.filter(i => ['envoyee', 'retard'].includes(i.statut)), late = rows.filter(i => i.statut === 'retard');
  const yearAgo = Date.now() - 365 * 864e5;
  const issued12 = rows.filter(i => i.statut !== 'annulee' && new Date(i.date_emission).getTime() >= yearAgo);
  const rate = issued12.length ? Math.round((issued12.filter(i => i.statut === 'payee').length / issued12.length) * 100) : 0;
  const kpis: [string, string, string, string][] = [
    ['Encaissé', ...deux(paid, 'payée'), ''],
    ['À encaisser', ...deux(open), ''],
    ['En retard', ...deux(late), late.length ? 'red' : ''],
    ['Recouvrement', `${rate} %`, 'sur 12 mois', ''],
  ];
  return (
    <div className="grid g4">
      {kpis.map(([l, v, d, tone]) => (
        <div key={l} className="card kpi4 static"><span className="eyebrow">{l}</span><span className={`kpi4-v num${tone ? ' ' + tone : ''}`}>{v}</span><span className="small muted">{d}</span></div>
      ))}
    </div>
  );
}

// Tableau des factures (maquette) : Membre, N°, Objet, Émise le, Montant, Statut, Facture (Afficher / PDF)
export default function Paiements({ f, filtre = '' }: { f: Factures; filtre?: Filter }) {
  const router = useRouter();
  const { rows, members, load } = f;
  const [editing, setEditing] = useState<Row | null>(null);
  const [paying, setPaying] = useState<Row | null>(null);
  const [error, setError] = useState('');

  async function remind(inv: Row) {
    if (!confirm(`Envoyer une relance pour la facture ${inv.numero} ?`)) return;
    try { toast(await runAction('invoice-remind', { id: inv.id })); load(); } catch (e) { setError((e as Error).message); }
  }

  const shown = (rows ?? []).filter(i => !filtre || (filtre === 'du' ? ['envoyee', 'retard'].includes(i.statut) : i.statut === filtre));
  const pg = usePage(shown, filtre);
  return (
    <>
      {(error || f.error) && <div className="err">{error || f.error}</div>}
      {rows === null ? <div className="card"><div className="skeleton"><span /><span /><span /></div></div> : (
        <section className="card mtbl-card">
          {shown.length === 0 ? (
            <div className="empty-state"><Icon name="ok" size={26} /><b>{filtre === 'retard' ? 'Aucune facture en retard' : 'Aucune facture pour le moment'}</b>
              {filtre === 'retard' && <span className="small muted">Toutes les échéances sont respectées.</span>}</div>
          ) : (
              <div className="tbl">
                <table className="mtbl inv-table">
                  <thead><tr><th>Membre</th><th>N°</th><th>Objet</th><th>Émise le</th><th className="r">Montant</th><th>Statut</th><th className="r">Facture</th></tr></thead>
                  <tbody>
                    {pg.items.map(i => {
                      const dd = due(i), unpaid = ['envoyee', 'retard'].includes(i.statut);
                      return (
                        <tr key={i.id} className={`click${i.statut === 'retard' ? ' is-late' : ''}`} onClick={() => router.push(`/paiements/${i.id}`)}>
                          <td><span className="inv-who"><Avatar kind="member" id={i.member_id} size={30} nom={members[i.member_id] ?? i.destinataire_nom} /><b>{members[i.member_id] ?? i.destinataire_nom ?? '—'}</b></span></td>
                          <td className="small num">{i.numero}</td>
                          <td className="small">{i.lignes?.[0]?.des || OBJET[i.objet] || i.objet}{(i.lignes?.length ?? 0) > 1 && <span className="inv-sub">+ {i.lignes.length - 1} autre{i.lignes.length > 2 ? 's' : ''} ligne{i.lignes.length > 2 ? 's' : ''}</span>}</td>
                          <td className="small nw">{court(i.date_emission)}</td>
                          <td className="r num"><b>{money(total(i.lignes), i.devise)}</b></td>
                          <td><span className={`pchip ${PCHIP[i.statut] ?? ''}`}>{i.statut === 'payee' ? '✓ Payée' : i.statut === 'envoyee' ? 'À régler' : STATUT[i.statut] ?? i.statut}</span>
                            <span className={`inv-sub due${dd.cls === 'late' ? ' late' : ''}`} title={dd.txt}>{i.statut === 'payee' ? i.mode_paiement || 'Réglée' : i.echeance ? (dd.cls === 'late' ? dd.txt : `échéance ${court(i.echeance)}`) : ''}</span></td>
                          <td className="r" onClick={e => e.stopPropagation()}>
                            <span className="inv-btns">
                              {unpaid && <button type="button" className="btn sm cta" title="Marquer comme payée" onClick={() => setPaying(i)}><Icon name="ok" size={14} /><span className="lbl lbl-pay">Payée</span></button>}
                              {unpaid && <button type="button" className="btn sm ghost nl-icon" title="Relancer par courriel" aria-label={`Relancer ${i.numero}`} onClick={() => remind(i)}><Icon name="send" size={15} /></button>}
                              <Link className="btn sm" href={`/paiements/${i.id}`} title="Afficher la facture"><Icon name="eye" size={14} /><span className="lbl">Afficher</span></Link>
                              <a className="btn sm" href={`/paiements/${i.id}?imprimer=1`} target="_blank" rel="noopener" title="Imprimer ou enregistrer en PDF"><Icon name="download" size={14} /><span className="lbl">PDF</span></a>
                              <button type="button" className="btn sm ghost nl-icon" title="Modifier" aria-label={`Modifier ${i.numero}`} onClick={() => setEditing(i)}><Icon name="edit" size={15} /></button>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          <Pager p={pg} quoi="factures" />
        </section>
      )}
      {paying && <PayModal inv={paying} onClose={() => setPaying(null)} onDone={() => { setPaying(null); load(); }} />}
      {editing && <EditModal table="invoices" row={editing} refs={refsDe(members)} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </>
  );
}
