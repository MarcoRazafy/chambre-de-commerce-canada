'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, money, type Row } from '@/lib/format';
import Avatar from './Avatar';
import Icon from './Icon';
import SettingsForm from './SettingsForm';

const longDate = (v: string) => new Date(v.slice(0, 10) + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const daysTo = (v: string) => Math.round((new Date(v.slice(0, 10) + 'T12:00').getTime() - new Date(new Date().toDateString() + ' 12:00').getTime()) / 864e5);

// Abonnement à la plateforme : formule et prochain prélèvement, utilisateurs facturés, détail de la prochaine facture, historique, réglages
export default function AbonnementSummary() {
  const [d, setD] = useState<{ saas: Row; users: Row[]; history: Row[] } | null>(null);
  const [edit, setEdit] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([api<Row>('/api/settings/saas'), api<Row[]>('/api/team_users'), api<Row[]>('/api/platform_invoices')])
      .then(([saas, users, history]) => setD({ saas, users, history })).catch(e => setError(e.message));
  }, [edit]);

  if (!d) return error ? <div className="err">{error}</div> : <div className="card"><div className="skeleton"><span /><span /><span /></div></div>;
  const { saas, users, history } = d, actifs = users.filter(u => u.actif);
  const base = Number(saas.base) || 0, per = Number(saas.parUser) || 0, sub = base + actifs.length * per;
  const tps = Math.round(sub * (Number(saas.tpsRate) || 0)) / 100, tvq = Math.round(sub * (Number(saas.tvqRate) || 0)) / 100;
  const totalTtc = sub + tps + tvq;
  const days = saas.prochaine ? daysTo(saas.prochaine) : null;
  const past = [...history].sort((a, b) => String(a.date_facture).localeCompare(String(b.date_facture))).slice(-6);
  const maxAmt = Math.max(totalTtc, ...past.map(h => Number(h.montant) || 0), 1);

  return (
    <>
      {/* Bannière de la formule */}
      <section className="sub-hero">
        <div className="sub-hero-l">
          <span className="sub-hero-k">Votre formule</span>
          <h2>{saas.plan || 'L’Alliée Virtuelle'}</h2>
          <p>{money(base, 'CAD')} par mois + {money(per, 'CAD')} par utilisateur actif · taxes en sus</p>
          <div className="sub-hero-actions">
            <button type="button" className="btn" onClick={() => setEdit(e => !e)}><Icon name="gear" size={16} /> {edit ? 'Fermer les réglages' : 'Réglages de l’abonnement'}</button>
            <Link className="btn ghost-light" href="/equipe"><Icon name="team" size={16} /> Gérer l’équipe</Link>
          </div>
        </div>
        <div className="sub-hero-r">
          <span className="sub-hero-k">Prochain prélèvement</span>
          <b className="num">{money(totalTtc, 'CAD')}</b>
          {saas.prochaine && <span>le {longDate(saas.prochaine)}{days != null && days >= 0 ? ` · dans ${days} jour${days > 1 ? 's' : ''}` : ''}</span>}
          {saas.moyen && <span className="sub-card-pm"><Icon name="star" size={16} fill />{saas.moyen}</span>}
        </div>
      </section>

      {edit && <SettingsForm cle="saas" />}

      <div className="grid g21 sub-grid">
        <section className="card">
          <div className="card-h"><div><h2>Utilisateurs facturés</h2><p className="small muted">{actifs.length} actif{actifs.length > 1 ? 's' : ''} sur {users.length} compte{users.length > 1 ? 's' : ''} d’Équipe & accès. Un compte désactivé n’est pas facturé.</p></div></div>
          <ul className="sub-users">
            {users.map(u => (
              <li key={u.id} className={u.actif ? '' : 'off'}>
                <Avatar kind="user" id={u.id} size={38} nom={u.nom} />
                <span className="sub-u-id"><b>{u.nom}</b><span>{u.email}</span></span>
                <span className={`sub-role${u.role === 'Administrateur' ? ' admin' : ''}`}>{u.role}</span>
                <span className="sub-u-price num">{u.actif ? `${money(per, 'CAD')}` : 'Non facturé'}</span>
                <span className={`state${u.actif ? ' on' : ''}`}>{u.actif ? 'Actif' : 'Inactif'}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="sub-side">
          {/* Prochaine facture, présentée comme un ticket */}
          <section className="card sub-receipt">
            <h2>Prochaine facture</h2>
            <dl>
              <div><dt>Forfait</dt><dd className="num">{money(base, 'CAD')}</dd></div>
              <div><dt>{actifs.length} utilisateur{actifs.length > 1 ? 's' : ''} × {money(per, 'CAD')}</dt><dd className="num">{money(actifs.length * per, 'CAD')}</dd></div>
              <div className="sub-rule" />
              <div><dt>Sous-total</dt><dd className="num">{money(sub, 'CAD')}</dd></div>
              {tps > 0 && <div className="muted"><dt>TPS ({saas.tpsRate} %)</dt><dd className="num">{money(tps, 'CAD')}</dd></div>}
              {tvq > 0 && <div className="muted"><dt>TVQ ({saas.tvqRate} %)</dt><dd className="num">{money(tvq, 'CAD')}</dd></div>}
              <div className="sub-total"><dt>Total{saas.prochaine ? ` le ${new Date(saas.prochaine + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}` : ''}</dt><dd className="num">{money(totalTtc, 'CAD')}</dd></div>
            </dl>
          </section>

          {/* Historique : les dernières factures et la prochaine, en barres */}
          <section className="card">
            <h2>Historique</h2>
            {past.length === 0 ? <p className="small muted">Aucune facture pour le moment.</p> : (
              <>
                <div className="sub-bars" role="img" aria-label={past.map(h => `${h.numero} : ${money(Number(h.montant), 'CAD')}`).join(' ; ')}>
                  {past.map(h => (
                    <span key={h.id} title={`${h.numero} · ${money(Number(h.montant), 'CAD')} · ${h.nb_utilisateurs} utilisateurs`}>
                      <i style={{ height: `${(Number(h.montant) / maxAmt) * 100}%` }} />
                      <small>{new Date(h.date_facture.slice(0, 10) + 'T12:00').toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</small>
                    </span>
                  ))}
                  <span className="next" title={`Prochaine facture · ${money(totalTtc, 'CAD')}`}>
                    <i style={{ height: `${(totalTtc / maxAmt) * 100}%` }} />
                    <small>{saas.prochaine ? new Date(saas.prochaine + 'T12:00').toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '') : 'suiv.'}</small>
                  </span>
                </div>
                <ul className="sub-hist">
                  {[...past].reverse().map(h => (
                    <li key={h.id}><span className="tile-ic xs"><Icon name="file" size={13} fill /></span>
                      <span className="grow"><b>{h.numero}</b><small>{longDate(h.date_facture)} · {h.nb_utilisateurs} utilisateurs</small></span>
                      <b className="num">{money(Number(h.montant), 'CAD')}</b></li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
