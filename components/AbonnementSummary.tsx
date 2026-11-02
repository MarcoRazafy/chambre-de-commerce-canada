'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, money, type Row } from '@/lib/format';

// Montant mensuel de l'abonnement : forfait + utilisateurs actifs × prix, plus taxes
export default function AbonnementSummary() {
  const [d, setD] = useState<{ saas: Row; users: Row[] } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([api<Row>('/api/settings/saas'), api<Row[]>('/api/team_users')]).then(([saas, users]) => setD({ saas, users })).catch(e => setError(e.message));
  }, []);

  if (!d) return error ? <div className="err">{error}</div> : null;
  const { saas, users } = d, actifs = users.filter(u => u.actif);
  const base = Number(saas.base) || 0, per = Number(saas.parUser) || 0, sub = base + actifs.length * per;
  const tps = Math.round(sub * (Number(saas.tpsRate) || 0)) / 100, tvq = Math.round(sub * (Number(saas.tvqRate) || 0)) / 100;
  return (
    <div className="grid g21">
      <div className="card">
        <div className="card-h"><div><h2>Utilisateurs payants</h2><p className="small muted">{actifs.length} actif(s) sur {users.length} compte(s) · ce sont les comptes d’Équipe & accès</p></div>
          <Link className="btn sm" href="/equipe">Gérer l’équipe</Link></div>
        {users.length === 0 ? <div className="empty">Aucun compte.</div> : (
          <div className="tbl"><table>
            <thead><tr><th>Utilisateur</th><th>Rôle</th><th className="r">Par mois</th><th>Actif</th></tr></thead>
            <tbody>{users.map(u => (
              <tr key={u.id}><td><b>{u.nom}</b><div className="small muted">{u.email}</div></td><td>{u.role}</td>
                <td className="r num">{money(u.actif ? per : 0, 'CAD')}</td><td>{u.actif ? <span className="chip c-green">Actif</span> : <span className="chip c-grey">Inactif</span>}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
      <div className="card">
        <h2>Prochaine facture</h2>
        <div className="inv-tot" style={{ width: '100%' }}>
          <div><span>Forfait</span><span className="num">{money(base, 'CAD')}</span></div>
          <div><span>{actifs.length} utilisateur(s) × {money(per, 'CAD')}</span><span className="num">{money(actifs.length * per, 'CAD')}</span></div>
          {tps > 0 && <div><span>TPS ({saas.tpsRate} %)</span><span className="num">{money(tps, 'CAD')}</span></div>}
          {tvq > 0 && <div><span>TVQ ({saas.tvqRate} %)</span><span className="num">{money(tvq, 'CAD')}</span></div>}
          <div className="t"><span>Total{saas.prochaine ? ' le ' + new Date(saas.prochaine + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span><span className="num">{money(sub + tps + tvq, 'CAD')}</span></div>
        </div>
        {saas.moyen && <div className="row between small"><span className="muted">Moyen de paiement</span><span>{saas.moyen}</span></div>}
      </div>
    </div>
  );
}
