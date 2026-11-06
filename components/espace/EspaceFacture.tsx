'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import type { Row } from '@/lib/format';
import Icon from '../Icon';
import { appel, argent, jour, totalLignes } from './api';
import { AnnoncerReglement, CHIP } from './EspaceFactures';

// Une facture, prête à imprimer ou à enregistrer en PDF
export default function EspaceFacture() {
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<Row | null>(null);
  const [erreur, setErreur] = useState('');
  const [payer, setPayer] = useState(false);
  const charger = useCallback(() => appel<Row>(`/api/espace/factures/${id}`).then(setD).catch(e => setErreur(e.message)), [id]);
  useEffect(() => { charger(); }, [charger]);
  const pret = !!d;
  useEffect(() => {
    if (!pret || new URLSearchParams(window.location.search).get('imprimer') !== '1') return;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [pret]);

  if (!d) return erreur ? <div className="err">{erreur}</div> : <div className="card"><div className="skeleton"><span /><span /><span /></div></div>;
  const { facture: f, org, membre, contact } = d;
  const [l, c] = CHIP[f.statut] ?? [f.statut, 'off'];
  return (
    <>
      <div className="head no-print"><div><h1>Facture {f.numero}</h1></div>
        <div className="actions">
          <Link className="btn" href="/espace/factures">‹ Mes factures</Link>
          {['envoyee', 'retard'].includes(f.statut) && <button className="btn" onClick={() => setPayer(true)}><Icon name="ok" size={16} /> J’ai payé</button>}
          <button className="btn cta" onClick={() => window.print()}><Icon name="download" size={16} /> Télécharger en PDF</button>
        </div></div>
      <div className="invdoc es-facture">
        <div className="invdoc-top"><div><b>{org.nom || 'Chambre de commerce'}</b><span>{[org.adresse, org.ville].filter(Boolean).join(', ')}</span></div>
          <div className="r"><b className="big">FACTURE</b><span>{f.numero}</span></div></div>
        <div className="invdoc-b">
          <div className="invcols">
            <div><span className="eyebrow">Émetteur</span><b>{org.nom}</b><span>{org.courriel} {org.tel}</span>
              {(org.nif || org.stat) && <span className="muted">{org.nif && `NIF : ${org.nif}`}{org.stat && ` · STAT : ${org.stat}`}</span>}</div>
            <div><span className="eyebrow">Facturé à</span><b>{membre.nom}</b><span>À l’attention de {contact.nom}{contact.fonction ? `, ${contact.fonction}` : ''}</span><span className="muted">{membre.ville}</span></div>
          </div>
          <div className="row between small"><span>Émise le {jour(f.date_emission)}</span>
            <span><span className={`pchip ${c}`}>{l}</span> {f.statut === 'payee' ? f.mode_paiement || '' : f.echeance ? `· à régler avant le ${jour(f.echeance)}` : ''}</span></div>
          <table className="invtbl"><thead><tr><th>Désignation</th><th className="r">Montant</th></tr></thead>
            <tbody>{(f.lignes ?? []).map((x: Row, i: number) => <tr key={i}><td>{x.des}</td><td className="r num">{argent(Number(x.mt), f.devise)}</td></tr>)}</tbody></table>
          <div className="invtot"><div><span>Total</span><b className="num">{argent(totalLignes(f.lignes), f.devise)}</b></div></div>
          {org.modalites && <p className="small muted">{org.modalites}</p>}
          {f.statut === 'payee' && <div className="stamp">PAYÉE</div>}
        </div>
      </div>
      {payer && <AnnoncerReglement f={f} onClose={() => setPayer(false)} onDone={() => { setPayer(false); charger(); }} />}
    </>
  );
}
