'use client';
import Link from 'next/link';
import { useState } from 'react';
import { api, relative, total, type Row } from '@/lib/format';
import { runAction } from '@/lib/ui-actions';
import { toast } from '@/lib/toast';
import Icon from '../../Icon';
import ModalBackdrop from '../../ModalBackdrop';
import StatusBadge from '../../StatusBadge';

const STATUT: Record<string, string> = { a_jour: 'À jour', retard: 'En retard', attente: 'En attente de paiement', demande: 'Nouvelle demande', refusee: 'Refusée' };
const MODES = ['Espèces', 'Virement', 'MVola', 'Orange Money', 'Airtel Money', 'Carte bancaire', 'Chèque'];
const money = (n: number, devise: string) => devise === 'CAD' ? `${n.toLocaleString('fr-FR')} $` : `${n.toLocaleString('fr-FR')} Ar`;
const longDate = (v: string) => new Date(v.slice(0, 10) + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const today = () => new Date().toISOString().slice(0, 10);
const act = (id: number, body: Row) => api<{ message: string }>(`/api/membres/${id}/action`, 'POST', body);

function Modal({ title, children, onClose, onSubmit, submit, busy, danger }: { title: string; children: React.ReactNode; onClose: () => void; onSubmit: () => void; submit: string; busy?: boolean; danger?: boolean }) {
  return (
    <ModalBackdrop onClose={onClose}>
      <form className="modal" style={{ width: 'min(100%, 500px)' }} onSubmit={e => { e.preventDefault(); onSubmit(); }}>
        <div className="modal-h"><h2>{title}</h2><button type="button" className="btn sm ghost" aria-label="Fermer" onClick={onClose}>✕</button></div>
        <div className="modal-b">{children}</div>
        <div className="modal-f"><button type="button" className="btn" onClick={onClose}>Annuler</button><button className={`btn ${danger ? 'danger' : 'cta'}`} disabled={busy}>{busy ? 'Un instant…' : submit}</button></div>
      </form>
    </ModalBackdrop>
  );
}

// Panneau « Adhésion & cotisation » : situation, formule, dates, et l'action du moment selon le statut
export default function Adhesion({ m, formules, invoices, onChanged }: { m: Row; formules: Row[]; invoices: Row[]; onChanged: () => void }) {
  const [open, setOpen] = useState<'' | 'pay' | 'refuse' | 'date' | 'formule' | 'renew'>('');
  const [busy, setBusy] = useState(false);
  const [v, setV] = useState<Row>({});
  const f = formules.find(x => x.id === m.formule_id);
  const paid = invoices.filter(i => i.objet === 'cotisation' && i.statut === 'payee').sort((a, b) => String(b.date_emission).localeCompare(String(a.date_emission)));
  const late = invoices.filter(i => i.statut === 'retard' && i.echeance).map(i => i.echeance).sort()[0];
  const lateDays = m.statut === 'retard' && late ? Math.max(0, Math.floor((Date.now() - new Date(late + 'T00:00').getTime()) / 864e5)) : 0;
  const urgent = lateDays > 30;
  const due = f?.prix != null ? money(Number(f.prix), f.devise) : null;
  const detail = m.statut === 'demande' ? `Demande déposée ${relative(m.created_at)}`
    : m.statut === 'refusee' ? 'Demande refusée : rien n’en paraît côté membre.'
    : m.statut === 'attente' ? (due ? `Approuvée · cotisation attendue : ${due}` : 'Approuvée · formule à choisir avant toute cotisation')
    : m.statut === 'retard' ? `${lateDays} jour${lateDays > 1 ? 's' : ''} de retard`
    : 'Cotisation réglée : aucun règlement à enregistrer.';

  async function run(fn: () => Promise<string>, close = true) {
    setBusy(true);
    try { toast(await fn()); if (close) setOpen(''); onChanged(); } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(false); }
  }
  const patch = (body: Row, msg: string) => run(async () => { await api(`/api/members/${m.id}`, 'PATCH', body); return msg; });
  const start = (k: typeof open, init: Row = {}) => { setV(init); setOpen(k); };

  return (
    <section className={`card adh${urgent ? ' urgent' : m.statut === 'a_jour' ? ' ok' : ''}`}>
      <h2>Adhésion &amp; cotisation</h2>
      <div className="adh-status"><StatusBadge value={m.statut} label={STATUT[m.statut] ?? m.statut} /><span className={urgent ? 'urgent' : ''}>{detail}</span></div>
      {m.statut === 'retard' && <div className="adh-gauge"><div className="nl-meter-bar"><span className={urgent ? 'red' : 'amber'} style={{ width: `${Math.min(lateDays, 30) / 30 * 100}%` }} /></div><small>Au-delà de 30 jours de retard, la relance devient urgente.</small></div>}

      <dl className="adh-dl">
        <div><dt>Membre depuis</dt><dd>{m.membre_depuis ? longDate(m.membre_depuis) : '—'}<button type="button" className="adh-edit" aria-label="Modifier la date d’adhésion" onClick={() => start('date', { d: m.membre_depuis?.slice(0, 10) ?? today() })}><Icon name="edit" size={13} /></button></dd></div>
        <div><dt>Formule</dt><dd>{f?.nom ?? 'Formule à choisir'}<button type="button" className="adh-edit" aria-label="Modifier la formule" onClick={() => start('formule', { f: m.formule_id ?? '' })}><Icon name="edit" size={13} /></button></dd></div>
        <div><dt>Cotisation</dt><dd>{due ? `${due} / an` : 'Cotisation à définir'}</dd></div>
        {paid[0] && <div><dt>Dernier règlement</dt><dd>{longDate(paid[0].date_emission)}{paid[0].mode_paiement ? ` · ${paid[0].mode_paiement}` : ''}</dd></div>}
        {m.statut !== 'demande' && m.statut !== 'refusee' && <div><dt>Prochain renouvellement</dt><dd>{m.renouvellement ? longDate(m.renouvellement) : 'Au premier règlement'}<button type="button" className="adh-edit" aria-label="Modifier la date de renouvellement" onClick={() => start('renew', { d: m.renouvellement?.slice(0, 10) ?? today() })}><Icon name="edit" size={13} /></button></dd></div>}
      </dl>

      <div className="adh-actions">
        {m.statut === 'demande' && <>
          <button className="btn cta" disabled={busy} onClick={() => confirm('Accepter cette demande ? La facture de cotisation sera émise et envoyée au membre.') && run(() => runAction('member-approve', { id: m.id }), false)}><Icon name="ok" size={16} /> Accepter la demande</button>
          <button className="btn rg-reject" onClick={() => start('refuse', { c: '' })}>Refuser la demande</button>
        </>}
        {m.statut === 'refusee' && <button className="btn" disabled={busy} onClick={() => confirm('Remettre cette demande à l’examen ?') && run(() => act(m.id, { op: 'reconsiderer' }).then(r => r.message), false)}>Reconsidérer</button>}
        {(m.statut === 'attente' || m.statut === 'retard') && <>
          <button className="btn cta" onClick={() => start('pay', { mode: 'Espèces', montant: f?.prix ?? '', date: today(), note: '' })}><Icon name="coin" size={16} /> {paid.length ? 'Enregistrer un règlement' : 'Enregistrer le paiement'}</button>
          <button className="btn" disabled={busy} onClick={() => confirm('Envoyer une relance pour ses factures impayées ?') && run(() => runAction('member-remind', { id: m.id }), false)}><Icon name="send" size={15} /> Envoyer une relance</button>
        </>}
        {m.statut === 'a_jour' && <button className="btn ghost" onClick={() => start('pay', { mode: 'Espèces', montant: f?.prix ?? '', date: today(), note: '' })}>Enregistrer un règlement anticipé</button>}
      </div>

      {open === 'pay' && (!f ? (
        <Modal title="Enregistrer le paiement" onClose={() => setOpen('')} onSubmit={() => { setOpen(''); start('formule', { f: '' }); }} submit="Choisir la formule">
          <p>Choisissez d’abord la formule du membre : elle fixe le montant attendu et la devise de la facture.</p>
        </Modal>
      ) : (
        <Modal title="Enregistrer le paiement" busy={busy} submit="Confirmer le paiement" onClose={() => setOpen('')}
          onSubmit={() => run(() => act(m.id, { op: 'payer', mode: v.mode, montant: Number(v.montant), date: v.date, note: v.note }).then(r => r.message))}>
          <p className="small muted">{paid.length ? `Enregistrez un règlement pour ${m.nom}.` : `Confirmez le règlement de la cotisation pour activer l’adhésion de ${m.nom}.`} La facture de cotisation ouverte est réglée, ou une facture réglée est créée.</p>
          <div className="pay-modes" role="radiogroup" aria-label="Mode de paiement">
            {MODES.map(x => <button key={x} type="button" role="radio" aria-checked={v.mode === x} className={v.mode === x ? 'on' : ''} onClick={() => setV({ ...v, mode: x })}>{x}</button>)}
          </div>
          <div className="form-grid">
            <div className="field"><label htmlFor="pm-m">Montant ({f.devise === 'CAD' ? 'dollars canadiens' : 'ariary'})</label><input id="pm-m" type="number" min={1} className="inp" value={v.montant} onChange={e => setV({ ...v, montant: e.target.value })} required />
              <span className="hint">{f.nom} : {due ?? 'sur devis'} par an</span></div>
            <div className="field"><label htmlFor="pm-d">Date du paiement</label><input id="pm-d" type="date" className="inp" value={v.date} onChange={e => setV({ ...v, date: e.target.value })} required /></div>
          </div>
          <div className="field"><label htmlFor="pm-n">Note interne (facultatif)</label><input id="pm-n" className="inp" maxLength={300} value={v.note} onChange={e => setV({ ...v, note: e.target.value })} placeholder="Ex. reçu remis en main propre" /></div>
        </Modal>
      ))}
      {open === 'refuse' && (
        <Modal title="Refuser la demande" busy={busy} danger submit="Refuser" onClose={() => setOpen('')} onSubmit={() => run(() => act(m.id, { op: 'refuser', commentaire: v.c }).then(r => r.message))}>
          <p className="small muted">La demande passe « refusée ». Rien n’en paraît côté membre, et le refus pourra être reconsidéré.</p>
          <div className="field"><label htmlFor="rf-c">Commentaire *</label><textarea id="rf-c" className="inp" rows={4} maxLength={2000} required value={v.c} onChange={e => setV({ c: e.target.value })} />
            <span className="hint">Visible de l’équipe seulement : le demandeur ne le reçoit pas.</span></div>
        </Modal>
      )}
      {open === 'date' && (
        <Modal title="Date d’adhésion" busy={busy} submit="Enregistrer" onClose={() => setOpen('')} onSubmit={() => patch({ membre_depuis: v.d }, 'Date d’adhésion modifiée.')}>
          <div className="field"><label htmlFor="ad-d">Membre depuis</label><input id="ad-d" type="date" className="inp" required value={v.d} onChange={e => setV({ d: e.target.value })} />
            <span className="hint">Elle fixe l’ancienneté affichée sur la fiche et dans l’annuaire.</span></div>
        </Modal>
      )}
      {open === 'renew' && (
        <Modal title="Prochain renouvellement" busy={busy} submit="Enregistrer" onClose={() => setOpen('')} onSubmit={() => patch({ renouvellement: v.d }, 'Date de renouvellement modifiée.')}>
          <div className="field"><label htmlFor="rn-d">Renouvellement le</label><input id="rn-d" type="date" className="inp" required value={v.d} onChange={e => setV({ d: e.target.value })} />
            <span className="hint">Normalement un an après le dernier règlement ; les rappels de cotisation partent d’ici.</span></div>
        </Modal>
      )}
      {open === 'formule' && (
        <Modal title="Formule d’adhésion" busy={busy} submit="Enregistrer" onClose={() => setOpen('')} onSubmit={() => patch({ formule_id: v.f === '' ? null : Number(v.f) }, 'Formule modifiée.')}>
          <div className="field"><label htmlFor="fm-f">Formule</label>
            <select id="fm-f" className="inp" value={v.f} onChange={e => setV({ f: e.target.value })}>
              <option value="">Aucune formule choisie</option>
              {formules.map(x => <option key={x.id} value={x.id}>{x.nom} — {x.prix != null ? money(Number(x.prix), x.devise) : 'sur devis'} / an</option>)}
            </select>
            <span className="hint">Elle fixe le montant attendu et la devise des prochaines factures. Les factures déjà émises ne bougent pas.</span></div>
        </Modal>
      )}
    </section>
  );
}

// Les 5 dernières factures du membre
export function Factures({ m, invoices }: { m: Row; invoices: Row[] }) {
  const list = [...invoices].sort((a, b) => String(b.date_emission).localeCompare(String(a.date_emission))).slice(0, 5);
  const ST: Record<string, string> = { payee: 'Payée', envoyee: 'Envoyée', retard: 'En retard', annulee: 'Annulée' };
  return (
    <section className="card">
      <div className="row between"><h2>Factures</h2>{invoices.length > 0 && <Link className="linkish small" href={`/paiements?q=${encodeURIComponent(m.nom)}`}>Toutes ({invoices.length})</Link>}</div>
      {list.length === 0 ? <p className="small muted">Aucune facture émise pour ce membre.</p> : (
        <ul className="mf-list">
          {list.map(i => (
            <li key={i.id}><Link href={`/paiements/${i.id}`}>
              <span className="grow"><b>{i.lignes?.[0]?.des ?? i.objet}</b><small>{i.numero} · {longDate(i.date_emission)}</small></span>
              <span className="mf-r"><b className="num">{money(total(i.lignes), i.devise)}</b><StatusBadge value={i.statut} label={ST[i.statut] ?? i.statut} /></span>
            </Link></li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Historique : les 8 dernières opérations du journal qui le concernent
export function Historique({ list }: { list: Row[] | null }) {
  const [all, setAll] = useState(false);
  const shown = (list ?? []).slice(0, all ? 30 : 8);
  return (
    <section className="card">
      <h2>Historique</h2>
      {list && list.length === 0 && <p className="small muted">Aucune opération enregistrée.</p>}
      <ol className="mh-list">
        {shown.map(h => (
          <li key={h.id}><span className="mh-dot" /><div><b>{h.titre}</b>{h.detail && <span>{h.detail}</span>}<small>{h.par} · {relative(h.created_at)}</small></div></li>
        ))}
      </ol>
      {(list?.length ?? 0) > 8 && !all && <button type="button" className="linkish small" onClick={() => setAll(true)}>Voir tout l’historique</button>}
    </section>
  );
}
