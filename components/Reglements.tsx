'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { RESOURCES } from '@/lib/resources';
import { api, display, relative, total, type Row } from '@/lib/format';
import { downloadCsv, runAction } from '@/lib/ui-actions';
import { toast } from '@/lib/toast';
import Avatar from './Avatar';
import Icon from './Icon';
import StatusBadge from './StatusBadge';
import { EditModal } from './ResourcePage';

const R = RESOURCES.reglements;
type Filter = '' | 'annoncé' | 'confirmé' | 'rejeté';
// Couleur de chaque moyen de paiement (pastille du moyen)
const MOYEN_CLS: Record<string, string> = { MVola: 'm-mvola', 'Orange Money': 'm-orange', 'Airtel Money': 'm-airtel', Virement: 'm-bank', 'Espèces': 'm-cash', 'Carte bancaire': 'm-card' };
const MOYEN_ICON: Record<string, string> = { Virement: 'coin', 'Espèces': 'coin', 'Carte bancaire': 'star' };
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
  const cols = R.fields.filter(f => f.list);
  const exportCsv = () => downloadCsv(R.title, cols.map(f => f.label), shown.map(r => cols.map(f => display(f, r, { invoices: Object.values(invoices) }, t => RESOURCES[t].label))));

  return (
    <>
      <div className="head page-tools"><div className="actions">
        <Link className="btn" href="/paiements">Paiements & factures</Link>
        <button className="btn" onClick={exportCsv} disabled={!shown.length}>Exporter</button>
        <button className="btn cta" onClick={() => setEditing({ statut: 'annoncé' })}><Icon name="plus" size={16} /> Ajouter</button>
      </div></div>
      {error && <div className="err">{error}</div>}

      {rows === null ? <div className="card"><div className="skeleton"><span /><span /><span /></div></div> : (
        <>
          <div className="grid g3">
            {([['annoncé', 'À vérifier', 'clock', 'déclarés par les membres'], ['confirmé', 'Confirmés', 'ok', 'factures passées payées'], ['rejeté', 'Rejetés', 'close', 'paiements non retrouvés']] as const).map(([st, label, icon, sub]) => (
              <button key={st} type="button" className={`card stat mkpi pay-kpi${filter === st ? ' sel' : ''}`} onClick={() => setFilter(st)} aria-pressed={filter === st}>
                <div className="stat-h"><span className="stat-l">{label}</span><span className="stat-ic tile-ic"><Icon name={icon} size={18} fill /></span></div>
                <div className="kpi-v"><span className="stat-v num">{n(st)}</span></div>
                <span className="stat-s">{sub}</span>
              </button>
            ))}
          </div>

          <section className="card sub-card">
            <div className="dir-tools">
              <label className="search-inp dir-search"><Icon name="search" size={16} />
                <input className="inp" placeholder="Rechercher une référence, une facture, un membre…" aria-label="Rechercher un règlement" value={term} onChange={e => setTerm(e.target.value)} /></label>
              <div className="seg" role="group" aria-label="Statut">
                {([['annoncé', 'À vérifier'], ['confirmé', 'Confirmés'], ['rejeté', 'Rejetés'], ['', 'Tous']] as const).map(([v, l]) =>
                  <button type="button" key={v} className={filter === v ? 'on' : ''} aria-pressed={filter === v} onClick={() => setFilter(v)}>{l} · {n(v)}</button>)}
              </div>
            </div>

            {shown.length === 0 ? (
              <div className="empty-state">
                <span className="tile-ic"><Icon name="ok" size={18} fill /></span>
                <b>{filter === 'annoncé' ? 'Aucun paiement à vérifier' : 'Aucun règlement ne correspond'}</b>
                <span className="small muted">Quand un membre déclare avoir payé (MVola, virement…), son règlement apparaît ici pour être confirmé.</span>
              </div>
            ) : (
              <ul className="rg-list">
                {shown.map(r => {
                  const inv = invoices[r.invoice_id], pending = r.statut === 'annoncé';
                  return (
                    <li key={r.id} className={`rg${pending ? ' pending' : ''}`}>
                      <span className={`rg-moyen ${MOYEN_CLS[r.moyen] ?? ''}`}><Icon name={MOYEN_ICON[r.moyen] ?? 'coin'} size={18} fill /></span>
                      <div className="rg-main">
                        <div className="rg-line">
                          <code className="rg-ref">{r.reference}</code>
                          {r.moyen && <span className={`rg-tag ${MOYEN_CLS[r.moyen] ?? ''}`}>{r.moyen}</span>}
                          <StatusBadge value={r.statut} label={r.statut[0].toUpperCase() + r.statut.slice(1)} />
                        </div>
                        {inv ? (
                          <div className="rg-inv">
                            <Avatar kind="member" id={inv.member_id} size={22} nom={members[inv.member_id]} />
                            <b>{members[inv.member_id]}</b><span>·</span>
                            <Link href={`/paiements/${inv.id}`}>Facture {inv.numero}</Link><span>·</span>
                            <b className="num">{money(total(inv.lignes), inv.devise)}</b>
                          </div>
                        ) : <div className="rg-inv warn"><Icon name="alert" size={14} />Aucune facture liée : vérifiez la référence avant de confirmer.</div>}
                        <span className="rg-when" title={full(r.annonce_le)}>Annoncé {relative(r.annonce_le)} · {full(r.annonce_le)}</span>
                      </div>
                      <div className="rg-act">
                        {pending && <>
                          <button type="button" className="btn sm cta" onClick={() => act('reglement-confirm', r, `Confirmer le règlement ${r.reference} ?${inv ? ` La facture ${inv.numero} sera marquée payée.` : ''}`)}><Icon name="ok" size={15} /> Confirmer</button>
                          <button type="button" className="btn sm ghost rg-reject" onClick={() => act('reglement-reject', r, `Rejeter le règlement ${r.reference} ?`)}>Rejeter</button>
                        </>}
                        <button type="button" className="btn sm ghost nl-icon" title="Modifier" aria-label={`Modifier ${r.reference}`} onClick={() => setEditing(r)}><Icon name="edit" size={15} /></button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
      {editing && <EditModal table="reglements" row={editing} refs={{ invoices: Object.values(invoices) }} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </>
  );
}
