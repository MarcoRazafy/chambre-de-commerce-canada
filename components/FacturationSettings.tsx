'use client';
import { useEffect, useState } from 'react';
import { api, type Row } from '@/lib/format';
import { toast } from '@/lib/toast';
import Icon from './Icon';

type Vals = { org: Row; relances: Row };
const SECTIONS = [
  { id: 'identite', label: 'Identité', icon: 'store' },
  { id: 'legal', label: 'Mentions légales', icon: 'doc' },
  { id: 'canada', label: 'Taxes au Canada', icon: 'coin' },
  { id: 'modalites', label: 'Modalités de paiement', icon: 'file' },
  { id: 'relances', label: 'Relances automatiques', icon: 'bell' },
];
// Étapes de relance, de la plus précoce à la plus tardive, placées sur la frise autour de l'échéance
const STEPS = [
  { k: 'avant30', label: 'J−30', hint: '30 jours avant' }, { k: 'avant7', label: 'J−7', hint: '7 jours avant' },
  { k: 'apres1', label: 'J+1', hint: '1 jour après' }, { k: 'apres7', label: 'J+7', hint: '7 jours après' },
  { k: 'apres15', label: 'J+15', hint: '15 jours après' }, { k: 'apres30', label: 'J+30', hint: '30 jours après' },
];

function Text({ label, value, onChange, hint, type = 'text', wide, placeholder }: { label: string; value: unknown; onChange: (v: string) => void; hint?: string; type?: string; wide?: boolean; placeholder?: string }) {
  const id = 'fs-' + label.replace(/\W+/g, '-').toLowerCase();
  return (
    <div className={`field${wide ? ' wide' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <input id={id} className="inp" type={type} value={String(value ?? '')} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}
function Switch({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="fs-switch">
      <input type="checkbox" className="switch" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span><b>{label}</b>{hint && <small>{hint}</small>}</span>
    </label>
  );
}
function Section({ id, icon, title, desc, children }: { id: string; icon: string; title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="card fs-sec" id={id}>
      <div className="fs-sec-h"><span className="tile-ic"><Icon name={icon} size={18} fill /></span><div><h2>{title}</h2><p className="small muted">{desc}</p></div></div>
      {children}
    </section>
  );
}

// Réglages de facturation : identité de la chambre (en-tête des factures), mentions légales, taxes canadiennes, modalités, relances
export default function FacturationSettings() {
  const [saved, setSaved] = useState<Vals | null>(null);
  const [vals, setVals] = useState<Vals | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api<Row>('/api/settings/org'), api<Row>('/api/settings/relances')])
      .then(([org, relances]) => { setSaved({ org, relances }); setVals({ org, relances }); })
      .catch(e => setError(e.message));
  }, []);

  if (!vals || !saved) return error ? <div className="err">{error}</div> : <div className="card"><div className="skeleton"><span /><span /><span /></div></div>;
  const o = vals.org, r = vals.relances;
  const setO = (k: string) => (v: unknown) => setVals(x => x && ({ ...x, org: { ...x.org, [k]: v } }));
  const setR = (k: string) => (v: unknown) => setVals(x => x && ({ ...x, relances: { ...x.relances, [k]: v } }));
  const dirty = JSON.stringify(vals) !== JSON.stringify(saved);

  async function save() {
    if (!vals) return;
    setBusy(true);
    try {
      const [org, relances] = await Promise.all([api<Row>('/api/settings/org', 'PUT', vals.org), api<Row>('/api/settings/relances', 'PUT', vals.relances)]);
      setSaved({ org, relances }); setVals({ org, relances }); setError('');
      toast('Réglages enregistrés.');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="fs">
      <nav className="fs-nav card" aria-label="Sections des réglages">
        {SECTIONS.map(s => <a key={s.id} href={`#${s.id}`}><Icon name={s.icon} size={16} />{s.label}</a>)}
      </nav>

      <div className="fs-main">
        {error && <div className="err">{error}</div>}

        <Section id="identite" icon="store" title="Identité de la chambre" desc="Affichée en haut de chaque facture et dans les courriels envoyés aux membres.">
          <div className="fs-split">
            <div className="form-grid">
              <Text label="Nom complet" value={o.nom} onChange={setO('nom')} wide />
              <Text label="Nom court" value={o.court} onChange={setO('court')} hint="Utilisé dans les objets de courriel." />
              <Text label="Site web" value={o.site} onChange={setO('site')} type="url" placeholder="https://…" />
              <Text label="Adresse" value={o.adresse} onChange={setO('adresse')} />
              <Text label="Ville" value={o.ville} onChange={setO('ville')} />
              <Text label="Courriel" value={o.courriel} onChange={setO('courriel')} type="email" />
              <Text label="Téléphone" value={o.tel} onChange={setO('tel')} type="tel" />
            </div>
            {/* Aperçu en direct de l'en-tête de facture */}
            <div className="fs-preview" aria-label="Aperçu de l’en-tête de facture">
              <span className="fs-preview-k">Aperçu de la facture</span>
              <div className="fs-letter">
                <div className="fs-letter-h">
                  <img src="/logo-app.png" alt="" width={34} height={34} />
                  <div><b>{o.nom || 'Nom de la chambre'}</b><span>{[o.adresse, o.ville].filter(Boolean).join(', ')}</span><span>{[o.courriel, o.tel].filter(Boolean).join(' · ')}</span></div>
                </div>
                <div className="fs-letter-t"><b>FACTURE</b><span>CC-2026-0041</span></div>
                <div className="fs-letter-lines"><i /><i /><i className="short" /></div>
                <div className="fs-letter-f">{[o.nif && `NIF ${o.nif}`, o.stat && `STAT ${o.stat}`, o.neq && `NEQ ${o.neq}`].filter(Boolean).join(' · ') || 'Mentions légales'}</div>
              </div>
            </div>
          </div>
        </Section>

        <Section id="legal" icon="doc" title="Mentions légales" desc="Numéros d’identification imprimés en bas des factures.">
          <div className="form-grid">
            <Text label="NIF" value={o.nif} onChange={setO('nif')} hint="Numéro d’identification fiscale (Madagascar)." />
            <Text label="STAT" value={o.stat} onChange={setO('stat')} hint="Numéro statistique (Madagascar)." />
            <Text label="NEQ (Québec)" value={o.neq} onChange={setO('neq')} hint="Si la chambre est immatriculée au Québec." />
          </div>
        </Section>

        <Section id="canada" icon="coin" title="Taxes au Canada" desc="Pour les factures en dollars canadiens. Les factures en ariary ne sont jamais taxées.">
          <Switch label="Appliquer la TPS et la TVQ aux factures en $ CA" checked={!!o.taxesCAD} onChange={setO('taxesCAD')} hint="Les taxes s’ajoutent au montant des lignes de la facture." />
          <div className={`form-grid fs-taxes${o.taxesCAD ? '' : ' off'}`}>
            <Text label="N° TPS" value={o.tps} onChange={setO('tps')} />
            <Text label="N° TVQ" value={o.tvq} onChange={setO('tvq')} />
            <Text label="Taux TPS (%)" value={o.tpsRate} onChange={v => setO('tpsRate')(v === '' ? '' : Number(v))} type="number" />
            <Text label="Taux TVQ (%)" value={o.tvqRate} onChange={v => setO('tvqRate')(v === '' ? '' : Number(v))} type="number" />
          </div>
          {o.taxesCAD && <p className="small muted">Exemple : 300,00 $ + TPS {o.tpsRate || 0} % + TVQ {o.tvqRate || 0} % = <b>{(300 * (1 + (Number(o.tpsRate) || 0) / 100 + (Number(o.tvqRate) || 0) / 100)).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $</b></p>}
        </Section>

        <Section id="modalites" icon="file" title="Modalités de paiement" desc="Texte imprimé sous le total de chaque facture.">
          <div className="field"><label htmlFor="fs-modalites">Modalités</label>
            <textarea id="fs-modalites" className="inp" rows={4} value={String(o.modalites ?? '')} onChange={e => setO('modalites')(e.target.value)} /></div>
        </Section>

        <Section id="relances" icon="bell" title="Relances automatiques" desc="Rappels envoyés aux membres pour les factures impayées. Une seule relance par étape et par facture.">
          <div className="fs-timeline" role="group" aria-label="Étapes de relance">
            {STEPS.slice(0, 2).map(s => <button key={s.k} type="button" className={`fs-step${r[s.k] ? ' on' : ''}`} aria-pressed={!!r[s.k]} title={s.hint} onClick={() => setR(s.k)(!r[s.k])}><b>{s.label}</b><small>{s.hint}</small></button>)}
            <span className="fs-due"><Icon name="cal" size={16} fill /><b>Échéance</b></span>
            {STEPS.slice(2).map(s => <button key={s.k} type="button" className={`fs-step late${r[s.k] ? ' on' : ''}`} aria-pressed={!!r[s.k]} title={s.hint} onClick={() => setR(s.k)(!r[s.k])}><b>{s.label}</b><small>{s.hint}</small></button>)}
          </div>
          <p className="small muted">Cliquez sur une étape pour l’activer ou la désactiver. Avant l’échéance, c’est un rappel ; après, une relance.</p>
          <div className="fs-channels">
            <Switch label="Par courriel" checked={!!r.courriel} onChange={setR('courriel')} hint="Envoyé au contact principal du membre." />
            <Switch label="Par notification" checked={!!r.notif} onChange={setR('notif')} hint="Affichée à l’équipe, dans la cloche." />
            <Switch label="Passer la facture en retard à l’échéance" checked={!!r.autoRetard} onChange={setR('autoRetard')} hint="Le membre passe aussi « en retard » pour une cotisation." />
          </div>
        </Section>
      </div>

      <div className={`fs-bar${dirty ? ' show' : ''}`} role="region" aria-label="Enregistrement" aria-hidden={!dirty}>
        <span><Icon name="info" size={16} /> Modifications non enregistrées</span>
        <div className="row">
          <button type="button" className="btn" onClick={() => setVals(saved)} tabIndex={dirty ? 0 : -1}>Annuler</button>
          <button type="button" className="btn cta" onClick={save} disabled={busy} tabIndex={dirty ? 0 : -1}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </div>
    </div>
  );
}
