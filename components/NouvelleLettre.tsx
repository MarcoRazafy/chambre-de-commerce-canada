'use client';
import { useEffect, useState } from 'react';
import { api, type Row } from '@/lib/format';
import { runAction } from '@/lib/ui-actions';
import { toast } from '@/lib/toast';
import Icon from './Icon';
import ModalBackdrop from './ModalBackdrop';
import { DestinatairesFenetre, regleDe, resumer, type Regle, useEtiquettes } from './etiquettes/Etiquettes';

type Envoi = 'brouillon' | 'programmer' | 'maintenant';
const ETAPES = ['Contenu', 'Destinataires', 'Envoi'] as const;
// « 2026-11-20T09:00 » pour le champ date-heure, à partir d'une date enregistrée
const local = (v?: string) => {
  const d = v ? new Date(v) : new Date(Date.now() + 864e5);
  if (!v) d.setHours(9, 0, 0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
};

// Panneau « Nouvelle newsletter » de la maquette : 1 · Contenu, 2 · Destinataires, 3 · Envoi.
// La lettre est enregistrée en brouillon dès la première étape ; rien ne part avant la dernière.
export default function NouvelleLettre({ lettre, onClose, onDone }: { lettre: Row; onClose: () => void; onDone: () => void }) {
  const [c, setC] = useState<Row>(lettre);
  const [etape, setEtape] = useState(0);
  const [titre, setTitre] = useState<string>(lettre.titre ?? '');
  const [contenu, setContenu] = useState<string>(lettre.contenu ?? '');
  const [envoi, setEnvoi] = useState<Envoi>(lettre.statut === 'Programmée' ? 'programmer' : 'brouillon');
  const [date, setDate] = useState(local(lettre.statut === 'Programmée' ? lettre.date_envoi : undefined));
  const [choix, setChoix] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { cat } = useEtiquettes();
  const regle: Regle = regleDe(c);

  // Nombre exact de personnes qui recevront la lettre
  useEffect(() => {
    let fini = false;
    api<Row>('/api/audiences/apercu', 'POST', regle).then(a => !fini && setTotal(a.total)).catch(() => {});
    return () => { fini = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(regle)]);

  async function enregistrer(extra: Row = {}) {
    if (!titre.trim()) throw new Error('Donnez un objet à la lettre.');
    const body = { titre: titre.trim(), contenu, ...extra };
    const row = c.id ? await api<Row>(`/api/campaigns/${c.id}`, 'PATCH', body) : await api<Row>('/api/campaigns', 'POST', { statut: 'Brouillon', ...body });
    setC(row);
    return row;
  }
  async function faire(fn: () => Promise<void>) {
    setBusy(true); setError('');
    try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const brouillon = () => faire(async () => { await enregistrer(c.statut === 'Programmée' ? {} : { statut: 'Brouillon' }); toast('Brouillon enregistré.'); onDone(); });
  const suivant = () => faire(async () => { await enregistrer(); setEtape(e => e + 1); });
  const terminer = () => faire(async () => {
    if (envoi === 'brouillon') { await enregistrer({ statut: 'Brouillon', date_envoi: '' }); toast('Brouillon enregistré.'); }
    else if (envoi === 'programmer') {
      const quand = new Date(date);
      if (!(quand.getTime() > Date.now())) throw new Error('Choisissez une date à venir.');
      await enregistrer({ statut: 'Programmée', date_envoi: quand.toISOString() });
      toast(`Envoi programmé le ${quand.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} à ${quand.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`);
    } else {
      if (!total) throw new Error('Aucun destinataire : choisissez au moins une personne.');
      if (!confirm(`Envoyer « ${titre.trim()} » maintenant à ${total} destinataire${total > 1 ? 's' : ''} ?`)) return;
      const row = await enregistrer({ statut: 'Brouillon' });
      toast(await runAction('campaign-send', { id: row.id }));
    }
    onDone();
  });

  return (
    <ModalBackdrop onClose={() => !choix && onClose()}>
      <aside className="drawer" role="dialog" aria-label={c.id ? `Lettre ${c.titre}` : 'Nouvelle newsletter'}>
        <div className="drawer-h"><h2>{c.id ? 'Continuer la lettre' : 'Nouvelle newsletter'}</h2>
          <button type="button" className="btn sm ghost" aria-label="Fermer" onClick={onClose}>✕</button></div>
        <div className="drawer-b">
          <div className="steps nl-steps" role="tablist" aria-label="Étapes">
            {ETAPES.map((l, i) => (
              <button key={l} type="button" role="tab" aria-selected={i === etape} className={i === etape ? 'on' : i < etape ? 'fait' : ''}
                disabled={busy || (i > 0 && !c.id && !titre.trim())} onClick={() => (i <= etape ? setEtape(i) : faire(async () => { await enregistrer(); setEtape(i); }))}>
                {i + 1} · {l}
              </button>
            ))}
          </div>
          {error && <div className="err">{error}</div>}

          {etape === 0 && <>
            <div className="field"><label htmlFor="nl-s">Objet</label>
              <input className="inp" id="nl-s" autoFocus value={titre} onChange={e => setTitre(e.target.value)} placeholder="La lettre CanCham — Décembre" /></div>
            <div className="field"><label htmlFor="nl-b">Contenu</label>
              <textarea className="inp nl-texte" id="nl-b" value={contenu} onChange={e => setContenu(e.target.value)} placeholder="À la une ce mois-ci…" />
              <span className="hint">Un lien de désabonnement est ajouté automatiquement pour les abonnés.</span></div>
            <p className="small muted">Étape 2 : tous les contacts, ou une ou plusieurs étiquettes. Étape 3 : envoyer maintenant ou programmer une date.</p>
          </>}

          {etape === 1 && <>
            <div className="nl-dest big">
              <span className="nl-dest-t"><Icon name="users" size={18} /><span><b>{total === null ? '…' : `${total} destinataire${total > 1 ? 's' : ''}`}</b>{resumer(regle, cat)}</span></span>
              <button type="button" className="btn cta" disabled={!cat} onClick={() => setChoix(true)}><Icon name="userplus" size={16} /> Choisir les destinataires</button>
            </div>
            <p className="small muted">Par défaut, tous les adhérents (avec tous leurs contacts) et tous les abonnés. Choisissez des étiquettes pour viser un groupe, ou décochez une personne pour la retirer de cette lettre.</p>
          </>}

          {etape === 2 && <>
            <div className="nl-envoi" role="radiogroup" aria-label="Envoi">
              {([['brouillon', 'Garder en brouillon', 'Rien ne part ; vous pourrez la reprendre plus tard.'],
                ['programmer', 'Programmer l’envoi', 'Elle partira seule à la date choisie.'],
                ['maintenant', 'Envoyer maintenant', `À ${total ?? '…'} destinataire${(total ?? 0) > 1 ? 's' : ''} : ${resumer(regle, cat)}.`]] as const).map(([v, l, d]) => (
                <label key={v} className={envoi === v ? 'on' : ''}>
                  <input type="radio" name="nl-envoi" checked={envoi === v} onChange={() => setEnvoi(v)} />
                  <span><b>{l}</b><small>{d}</small></span>
                </label>
              ))}
            </div>
            {envoi === 'programmer' && <div className="field"><label htmlFor="nl-d">Date et heure d’envoi</label>
              <input className="inp" id="nl-d" type="datetime-local" value={date} onChange={e => setDate(e.target.value)} /></div>}
            {envoi === 'maintenant' && <p className="small nl-warn"><Icon name="alert" size={15} /> Les courriels partent vraiment, à des personnes réelles. Relisez l’objet et le contenu avant.</p>}
          </>}
        </div>
        <div className="drawer-f">
          {etape > 0 && <button type="button" className="btn ghost" disabled={busy} onClick={() => setEtape(e => e - 1)}>‹ Retour</button>}
          <span className="grow" />
          <button type="button" className="btn" disabled={busy || !titre.trim()} onClick={brouillon}>Enregistrer le brouillon</button>
          {etape < 2
            ? <button type="button" className="btn cta" disabled={busy || !titre.trim()} onClick={suivant}>Continuer ›</button>
            : <button type="button" className="btn cta" disabled={busy} onClick={terminer}>{envoi === 'maintenant' ? <><Icon name="send" size={15} /> Envoyer</> : envoi === 'programmer' ? 'Programmer' : 'Terminer'}</button>}
        </div>
      </aside>
      {choix && cat && c.id && <DestinatairesFenetre titre={titre} initiale={regle} cat={cat} onClose={() => setChoix(false)}
        onSave={async r => { try { const x = await api<Row>(`/api/campaigns/${c.id}/destinataires`, 'PUT', r); setC(v => ({ ...v, ...r })); toast(`Destinataires enregistrés : ${x.total}.`); setChoix(false); } catch (e) { toast((e as Error).message, 'error'); } }} />}
    </ModalBackdrop>
  );
}
