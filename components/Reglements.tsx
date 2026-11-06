'use client';
import Link from 'next/link';
import { Pager, usePage } from './Pagination';
import { useCallback, useEffect, useState } from 'react';
import { RESOURCES } from '@/lib/resources';
import { api, display, relative, total, type Row } from '@/lib/format';
import { downloadCsv, runAction } from '@/lib/ui-actions';
import { toast } from '@/lib/toast';
import Icon from './Icon';
import { EditModal } from './ResourcePage';

const R = RESOURCES.reglements;
type Filter = '' | 'annoncé' | 'confirmé' | 'rejeté';
// Couleur de chaque moyen de paiement (pastille du moyen)
const MOYEN_CLS: Record<string, string> = { MVola: 'm-mvola', 'Orange Money': 'm-orange', 'Airtel Money': 'm-airtel', Virement: 'm-bank', 'Espèces': 'm-cash', 'Carte bancaire': 'm-card' };
const money = (n: number, devise: string) => devise === 'CAD' ? `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $` : `${n.toLocaleString('fr-FR')} Ar`;
const full = (v: string) => new Date(v).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) + ' à ' + new Date(v).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

// Page Règlements annoncés : les paiements déclarés par les membres, à vérifier puis confirmer (la facture passe payée) ou rejeter
export default function Reglements() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [invoices, setInvoices] = useState<Record<number, Row>>({});
  const [members, setMembers] = useState<Record<number, string>>({});
  const [filter, setFilter] = useState<Filter>('annoncé');
  const [term, setTerm] = useState('');
  const [editing, setEditing] = useState<Row | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => Promise.all([api<Row[]>('/api/reglements'), api<Row[]>('/api/invoices'), api<Row[]>('/api/members')])
    .then(([r, i, m]) => {
      setRows(r);
      setInvoices(Object.fromEntries(i.map(x => [x.id, x])));
      setMembers(Object.fromEntries(m.map(x => [x.id, x.nom])));
      setError('');
      if (!r.some(x => x.statut === 'annoncé')) setFilter(f => (f === 'annoncé' ? '' : f));
    }).catch(e => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  async function act(action: string, r: Row, question: string) {
    if (!confirm(question)) return;
    try { toast(await runAction(action, { id: r.id })); load(); } catch (e) { setError((e as Error).message); }
  }

  const all = rows ?? [];
  const n = (st: Filter) => all.filter(r => !st || r.statut === st).length;
  const shown = all.filter(r => (!filter || r.statut === filter) && (!term || [r.reference, r.moyen, invoices[r.invoice_id]?.numero, members[invoices[r.invoice_id]?.member_id]].join(' ').toLowerCase().includes(term.toLowerCase())));
  const pg = usePage(shown, [filter, term]);
  const cols = R.fields.filter(f => f.list);
  const exportCsv = () => downloadCsv(R.title, cols.map(f => f.label), shown.map(r => cols.map(f => display(f, r, { invoices: Object.values(invoices) }, t => RESOURCES[t].label))));

  async function lier(r: Row, invoiceId: string) {
    if (!invoiceId) return;
    try { await api(`/api/reglements/${r.id}`, 'PATCH', { invoice_id: Number(invoiceId) }); toast('Règlement lié à la facture.'); load(); } catch (e) { setError((e as Error).message); }
  }
  const aRegler = Object.values(invoices).filter(i => ['envoyee', 'retard'].includes(i.statut));

  // Maquette : une ligne par règlement (référence, moyen, quand), lier à une facture, Rejeter, Confirmer
  return (
    <>
      {error && <div className="err">{error}</div>}
      {rows === null ? <div className="card"><div className="skeleton"><span /><span /><span /></div></div> : (
        <section className="card">
          <div className="row between">
            <div className="row" style={{ gap: 6 }}>
              {([['annoncé', 'À vérifier'], ['confirmé', 'Confirmés'], ['rejeté', 'Rejetés'], ['', 'Tous']] as const).map(([v, l]) =>
                <button type="button" key={v} className={`fchip${filter === v ? ' on' : ''}`} aria-pressed={filter === v} onClick={() => setFilter(v)}>{l} · {n(v)}</button>)}
            </div>
            <div className="actions">
              {all.length > 6 && <input className="inp rg-search" placeholder="Référence, facture, membre…" aria-label="Rechercher un règlement" value={term} onChange={e => setTerm(e.target.value)} />}
              <button className="btn sm" onClick={exportCsv} disabled={!shown.length}><Icon name="download" size={14} /> Exporter</button>
              <button className="btn sm" onClick={() => setEditing({ statut: 'annoncé' })}><Icon name="plus" size={14} /> Ajouter un règlement</button>
            </div>
          </div>

          {shown.length === 0 ? (
            <div className="empty-state">
              <span className="tile-ic"><Icon name="ok" size={18} fill /></span>
              <b>{filter === 'annoncé' ? 'Aucun paiement à vérifier' : 'Aucun règlement ne correspond'}</b>
              <span className="small muted">Quand un membre déclare avoir payé (MVola, virement…), son règlement apparaît ici pour être confirmé.</span>
            </div>
          ) : (
            <div className="list rg-rows">
              {pg.items.map(r => {
                const inv = invoices[r.invoice_id], pending = r.statut === 'annoncé';
                return (
                  <div key={r.id} className="it">
                    <div className="grow">
                      <div className="row" style={{ gap: 8 }}><b className="small mono-ref">{r.reference}</b>
                        {r.moyen && <span className={`rg-tag ${MOYEN_CLS[r.moyen] ?? ''}`}>{r.moyen}</span>}
                        {!pending && <span className={`pchip ${r.statut === 'confirmé' ? 'ok' : 'off'}`}>{r.statut === 'confirmé' ? '✓ Confirmé' : 'Rejeté'}</span>}</div>
                      <div className="small muted" title={full(r.annonce_le)}>Annoncé {relative(r.annonce_le)} · {inv
                        ? <><Link href={`/paiements/${inv.id}`}>facture {inv.numero}</Link> · {members[inv.member_id]} · {money(total(inv.lignes), inv.devise)}</>
                        : <span className="rg-none">aucune facture liée</span>}</div>
                    </div>
                    {pending && !inv && <select className="inp rg-lier" aria-label={`Lier ${r.reference} à une facture`} value="" onChange={e => lier(r, e.target.value)}>
                      <option value="">Lier à une facture…</option>
                      {aRegler.map(i => <option key={i.id} value={i.id}>{i.numero} · {members[i.member_id] ?? ''}</option>)}
                    </select>}
                    {pending && <>
                      <button type="button" className="btn sm" onClick={() => act('reglement-reject', r, `Rejeter le règlement ${r.reference} ?`)}>Rejeter</button>
                      <button type="button" className="btn sm green" onClick={() => act('reglement-confirm', r, `Confirmer le règlement ${r.reference} ?${inv ? ` La facture ${inv.numero} sera marquée payée.` : ''}`)}><Icon name="ok" size={14} /> Confirmer</button>
                    </>}
                    <button type="button" className="btn sm ghost nl-icon" title="Modifier" aria-label={`Modifier ${r.reference}`} onClick={() => setEditing(r)}><Icon name="edit" size={15} /></button>
                  </div>
                );
              })}
            </div>
          )}
          <Pager p={pg} quoi="règlements" />
        </section>
      )}
      {editing && <EditModal table="reglements" row={editing} refs={{ invoices: Object.values(invoices) }} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </>
  );
}
