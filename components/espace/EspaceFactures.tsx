'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { Row } from '@/lib/format';
import { toast } from '@/lib/toast';
import Icon from '../Icon';
import ModalBackdrop from '../ModalBackdrop';
import { appel, argent, jour, totalLignes } from './api';
import { useMoi } from './EspaceShell';

const MOYENS = ['MVola', 'Orange Money', 'Airtel Money', 'Virement', 'Espèces', 'Carte bancaire'];
export const CHIP: Record<string, [string, string]> = { payee: ['✓ Payée', 'ok'], envoyee: ['À régler', 'warn'], retard: ['En retard', 'late'] };

// « J'ai payé » : le membre annonce son règlement, la Chambre le vérifie puis marque la facture payée
export function AnnoncerReglement({ f, onClose, onDone }: { f: Row; onClose: () => void; onDone: () => void }) {
  const [moyen, setMoyen] = useState('MVola');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  async function envoyer() {
    setBusy(true);
    try { await appel(`/api/espace/factures/${f.id}/reglement`, 'POST', { moyen, reference }); toast('Merci : la Chambre va vérifier votre règlement.'); onDone(); }
    catch (e) { toast((e as Error).message, 'error'); setBusy(false); }
  }
  return (
    <ModalBackdrop onClose={onClose}>
      <div className="modal" style={{ width: 'min(100%, 480px)' }} role="dialog" aria-label="Annoncer un règlement">
        <div className="modal-h"><h2>J’ai payé la facture {f.numero}</h2><button type="button" className="btn sm ghost" aria-label="Fermer" onClick={onClose}>✕</button></div>
        <div className="modal-b">
          <p className="small muted">{argent(totalLignes(f.lignes), f.devise)}. Indiquez comment vous avez payé : la Chambre vérifie la transaction puis marque la facture payée.</p>
          <div className="pay-modes" role="radiogroup" aria-label="Moyen de paiement">
            {MOYENS.map(m => <button key={m} type="button" role="radio" aria-checked={moyen === m} className={moyen === m ? 'on' : ''} onClick={() => setMoyen(m)}>{m}</button>)}
          </div>
          <div className="field"><label htmlFor="es-ref">Référence du paiement</label>
            <input id="es-ref" className="inp" value={reference} onChange={e => setReference(e.target.value)} placeholder="Numéro de transaction, de virement…" /></div>
        </div>
        <div className="modal-f"><button type="button" className="btn" onClick={onClose}>Annuler</button>
          <button type="button" className="btn cta" disabled={busy || !reference.trim()} onClick={envoyer}>{busy ? 'Envoi…' : 'Envoyer à la Chambre'}</button></div>
      </div>
    </ModalBackdrop>
  );
}

// Mes factures : liste, état, « J'ai payé »
export default function EspaceFactures() {
  const { recharger } = useMoi();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [payer, setPayer] = useState<Row | null>(null);
  const charger = useCallback(() => appel<Row[]>('/api/espace/factures').then(setRows).catch(e => toast(e.message, 'error')), []);
  useEffect(() => { charger(); }, [charger]);
  const aRegler = (rows ?? []).filter(f => ['envoyee', 'retard'].includes(f.statut));
  return (
    <>
      <div className="head"><div><h1>Mes factures</h1><p className="muted">Cotisations, événements et services facturés par la Chambre.</p></div></div>
      {rows === null ? <div className="card"><div className="skeleton"><span /><span /><span /></div></div> : (
        <>
          {aRegler.length > 0 && <div className="abo-alert"><Icon name="alert" size={18} /><span className="grow"><b>{aRegler.length} facture{aRegler.length > 1 ? 's' : ''} à régler</b> : après votre paiement (MVola, virement…), cliquez sur « J’ai payé » pour prévenir la Chambre.</span></div>}
          <section className="card mtbl-card">
            {rows.length === 0 ? <div className="empty-state"><Icon name="file" size={24} /><b>Aucune facture pour le moment</b></div> : (
              <div className="tbl">
                <table className="mtbl">
                  <thead><tr><th>N°</th><th>Objet</th><th>Émise le</th><th className="r">Montant</th><th>Statut</th><th className="r">Facture</th></tr></thead>
                  <tbody>
                    {rows.map(f => {
                      const [l, c] = CHIP[f.statut] ?? [f.statut, 'off'], due = ['envoyee', 'retard'].includes(f.statut);
                      const annonce = f.reglement?.statut === 'annoncé';
                      return (
                        <tr key={f.id}>
                          <td className="small num">{f.numero}</td>
                          <td className="small">{f.lignes?.[0]?.des ?? f.objet}</td>
                          <td className="small nw">{jour(f.date_emission)}</td>
                          <td className="r num"><b>{argent(totalLignes(f.lignes), f.devise)}</b></td>
                          <td><span className={`pchip ${c}`}>{l}</span>
                            <span className="inv-sub">{f.statut === 'payee' ? f.mode_paiement || 'Réglée' : annonce ? 'Règlement annoncé, en vérification' : f.echeance ? `échéance ${jour(f.echeance)}` : ''}</span></td>
                          <td className="r"><span className="inv-btns">
                            {due && !annonce && <button className="btn sm cta" onClick={() => setPayer(f)}><Icon name="ok" size={14} /> J’ai payé</button>}
                            <Link className="btn sm" href={`/espace/factures/${f.id}`}><Icon name="eye" size={14} /> Afficher</Link>
                            <a className="btn sm" href={`/espace/factures/${f.id}?imprimer=1`} target="_blank" rel="noopener"><Icon name="download" size={14} /> PDF</a>
                          </span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
      {payer && <AnnoncerReglement f={payer} onClose={() => setPayer(null)} onDone={() => { setPayer(null); charger(); recharger(); }} />}
    </>
  );
}
