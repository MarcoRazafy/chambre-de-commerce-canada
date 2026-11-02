'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api, invoiceTotals, money, type Ligne, type Row } from '@/lib/format';
import { ROW_ACTIONS, runAction } from '@/lib/ui-actions';

const fDL = (d: string) => new Date(d.length === 10 ? d + 'T12:00' : d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const STATUT: Record<string, [string, string]> = { envoyee: ['Envoyée', 'c-blue'], payee: ['Payée', 'c-green'], retard: ['En retard', 'c-red'], annulee: ['Annulée', 'c-grey'] };

// Aperçu imprimable de la facture (Imprimer → « Enregistrer en PDF » dans le navigateur)
export default function InvoicePreview({ id }: { id: number }) {
  const [d, setD] = useState<{ inv: Row; m: Row; contact?: Row; org: Row } | null>(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const inv = await api<Row>(`/api/invoices/${id}`);
      const [m, contacts, org] = await Promise.all([api<Row>(`/api/members/${inv.member_id}`), api<Row[]>(`/api/contacts?member_id=${inv.member_id}`), api<Row>('/api/settings/org')]);
      setD({ inv, m, contact: contacts.sort((a, b) => Number(b.principal) - Number(a.principal))[0], org });
    } catch (e) { setError((e as Error).message); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function act(action: string, question?: string, ask?: string) {
    if (question && !confirm(question)) return;
    const mode = ask ? prompt(ask) : undefined;
    if (mode === null) return;
    try { setMsg(await runAction(action, { id, mode: mode?.trim() })); setError(''); load(); } catch (e) { setError((e as Error).message); }
  }

  if (!d) return error ? <div className="err">{error}</div> : <div className="empty">Chargement…</div>;
  const { inv, m, contact, org } = d, t = invoiceTotals(inv as { lignes: Ligne[]; devise: string }, org);
  return (
    <>
      <div className="head no-print">
        <div><div className="eyebrow"><Link href="/paiements">Paiements & factures</Link></div><h1>Facture <em>{inv.numero}</em></h1></div>
        <div className="actions">
          {ROW_ACTIONS.invoices.filter(a => a.show(inv)).map(a => <button key={a.action} className="btn" onClick={() => act(a.action, a.confirm, a.ask)}>{a.label}</button>)}
          <button className="btn cta" onClick={() => window.print()}>Imprimer / PDF</button>
        </div>
      </div>
      {error && <div className="err no-print">{error}</div>}
      {msg && <div className="chip c-green no-print" style={{ alignSelf: 'flex-start' }}>{msg}</div>}
      <div className="grid g21">
        <div className="invoice">
          <div className="row between" style={{ alignItems: 'flex-start' }}>
            <div className="brand" style={{ padding: 0 }}><div className="brand-mark">CC</div><div><b>{org.court || org.nom || 'Chambre de commerce'}</b><span>{org.nom && org.court ? org.nom : ''}</span></div></div>
            <div style={{ textAlign: 'right' }}><h2>FACTURE</h2><div className="mono">{inv.numero}</div><span className={`chip ${STATUT[inv.statut][1]}`}>{STATUT[inv.statut][0]}</span></div>
          </div>
          <div className="inv-cols">
            <div><div className="eyebrow">Émetteur</div>{org.nom}<br />{org.adresse}<br />{org.ville}<br />{org.courriel} {org.tel}
              {org.nif && <><br />NIF : {org.nif}</>}{org.stat && <> · STAT : {org.stat}</>}
              {inv.devise === 'CAD' && org.tps && <><br />TPS : {org.tps}</>}{inv.devise === 'CAD' && org.tvq && <> · TVQ : {org.tvq}</>}</div>
            <div><div className="eyebrow">Facturé à</div><b>{m.nom}</b>{contact && <><br />{contact.nom}{contact.fonction ? `, ${contact.fonction}` : ''}<br />{contact.email}</>}<br />{m.ville}
              <div style={{ marginTop: 8 }}><div className="eyebrow">Dates</div>Émise le {fDL(inv.date_emission)}<br />Échéance : {fDL(inv.echeance)}</div></div>
          </div>
          <table>
            <thead><tr><th>Désignation</th><th className="r">Montant</th></tr></thead>
            <tbody>{(inv.lignes as Ligne[]).map((l, i) => <tr key={i}><td>{l.des}</td><td className="r num">{money(l.mt, inv.devise)}</td></tr>)}</tbody>
          </table>
          <div className="inv-tot">
            {t.tps > 0 && <><div><span>Sous-total</span><span className="num">{money(t.sub, inv.devise)}</span></div>
              <div><span>TPS ({org.tpsRate} %)</span><span className="num">{money(t.tps, 'CAD')}</span></div>
              <div><span>TVQ ({org.tvqRate} %)</span><span className="num">{money(t.tvq, 'CAD')}</span></div></>}
            <div className="t"><span>Total</span><span className="num">{money(t.total, inv.devise)}</span></div>
          </div>
          {org.modalites && <p className="small muted">{org.modalites}</p>}
          {!org.nom && <p className="small muted no-print">Astuce : complétez les informations de la Chambre dans « Réglages de facturation ».</p>}
        </div>
        <div className="card no-print">
          <h2>Historique</h2>
          <div className="timeline">{(inv.historique as Row[]).slice().reverse().map((h, i) => (
            <div className="t" key={i}><b>{h.t}</b><span className="small muted">{new Date(h.d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></div>
          ))}{!inv.historique.length && <span className="small muted">Aucun événement.</span>}</div>
          <dl className="kv"><dt>Relances</dt><dd>{inv.nb_relances}</dd><dt>Mode de paiement</dt><dd>{inv.mode_paiement ?? '—'}</dd></dl>
        </div>
      </div>
    </>
  );
}
