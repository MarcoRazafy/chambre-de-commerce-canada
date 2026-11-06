'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, relative, type Row } from '@/lib/format';
import { toast } from '@/lib/toast';
import type { Reponses } from '@/lib/maillage';
import Icon from '../Icon';
import Questionnaire, { type Donnees } from './Questionnaire';

export const lienDe = (jeton: string) => `${window.location.origin}/questionnaire/${jeton}`;
export async function copierLien(memberId: number, nouveau = false) {
  const { jeton } = await api<Row>(`/api/maillage/${memberId}/lien${nouveau ? '?nouveau=1' : ''}`, 'POST');
  const url = lienDe(jeton);
  try { await navigator.clipboard.writeText(url); toast('Lien copié : collez-le dans un courriel, WhatsApp ou la Messagerie.'); } catch { toast(url); }
  return jeton as string;
}

// Onglet « Maillage » de la fiche membre : son lien personnel, et le questionnaire que l'équipe peut remplir avec lui
export default function MaillageMembre({ memberId }: { memberId: number }) {
  const [d, setD] = useState<(Donnees & Row) | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => api<Donnees & Row>(`/api/maillage/${memberId}`).then(setD).catch(e => setError(e.message)), [memberId]);
  useEffect(() => { load(); }, [load]);
  const enregistrer = useCallback(async (patch: Reponses) => {
    const p = await api<Row>(`/api/maillage/${memberId}`, 'PUT', patch);
    setD(v => (v ? { ...v, ...p, rempli_par: 'vous', maj_le: new Date().toISOString() } : v));
  }, [memberId]);

  async function lien(nouveau = false) {
    if (nouveau && !confirm('Créer un nouveau lien ? L’ancien ne fonctionnera plus.')) return;
    try { const jeton = await copierLien(memberId, nouveau); setD(v => (v ? { ...v, jeton } : v)); } catch (e) { toast((e as Error).message, 'error'); }
  }
  async function desactiver() {
    if (!confirm('Désactiver ce lien ? Le membre ne pourra plus ouvrir son questionnaire tant que vous ne lui en envoyez pas un nouveau.')) return;
    try { await api(`/api/maillage/${memberId}/lien`, 'DELETE'); setD(v => (v ? { ...v, jeton: null } : v)); toast('Lien désactivé.'); } catch (e) { toast((e as Error).message, 'error'); }
  }

  if (!d) return error ? <div className="err">{error}</div> : <div className="card"><div className="skeleton"><span /><span /><span /></div></div>;
  return (
    <div className="mq-membre">
      <section className="card mq-lien">
        <div className="card-h"><div><h2>Questionnaire de maillage</h2>
          <p className="small muted">{d.pct === 100 ? `Complet${d.complete_le ? ' depuis ' + relative(d.complete_le) : ''} : ce membre participe aux mises en relation.`
            : `${d.faites} question${d.faites > 1 ? 's' : ''} essentielle${d.faites > 1 ? 's' : ''} sur ${d.total}.`}
            {d.maj_le && ` Dernière réponse ${relative(d.maj_le)}${d.rempli_par ? ` (${d.rempli_par})` : ''}.`}</p></div>
          <span className={`pchip ${d.pct === 100 ? 'ok' : d.pct ? 'warn' : 'off'}`}>{d.pct === 100 ? '✓ Complet' : d.pct ? `${d.pct} %` : 'Pas commencé'}</span></div>
        <div className="bar"><i style={{ width: `${d.pct}%` }} /></div>
        {d.jeton ? (
          <div className="row mq-lien-l">
            <input className="inp grow" readOnly value={lienDe(d.jeton)} aria-label="Lien personnel du membre" onFocus={e => e.target.select()} />
            <button className="btn" onClick={() => lien()}><Icon name="copy" size={15} /> Copier le lien</button>
            <button className="btn ghost" onClick={() => lien(true)}>Nouveau lien</button>
            <button className="btn ghost" onClick={desactiver}>Désactiver</button>
          </div>
        ) : (
          <div className="row"><button className="btn cta" onClick={() => lien()}><Icon name="copy" size={15} /> Créer et copier le lien personnel</button>
            <span className="small muted">Le membre répond sans compte ni mot de passe ; ses réponses arrivent ici.</span></div>
        )}
      </section>
      <Questionnaire data={d} enregistrer={enregistrer} mode="equipe" onTermine={() => toast('Réponses enregistrées.')} />
    </div>
  );
}
