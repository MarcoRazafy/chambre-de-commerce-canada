import Link from 'next/link';
import { Suspense } from 'react';
import { connection } from 'next/server';
import { q } from '@/lib/db';
import { money } from '@/lib/format';

type Stats = { a_jour: number; demandes: number; retard: number; events: number; threads: number; abonnes: number; du_mga: number; du_cad: number };

export default function Dashboard() {
  return (
    <>
      <div className="head"><div><div className="eyebrow">Pilotage</div><h1>Tableau de <em>bord</em></h1></div></div>
      <Suspense fallback={<div className="empty">Chargement…</div>}><Kpis /></Suspense>
    </>
  );
}

async function Kpis() {
  await connection();
  let s: Stats;
  try {
    [s] = await q<Stats>(`
      select (select count(*) from members where statut = 'a_jour')::int as a_jour,
             (select count(*) from members where statut = 'demande')::int as demandes,
             (select count(*) from invoices where statut = 'retard')::int as retard,
             (select count(*) from events where date_debut >= now())::int as events,
             (select count(*) from threads)::int as threads,
             (select count(*) from subscribers where statut = 'Abonné')::int as abonnes,
             coalesce(sum(t.total) filter (where i.devise = 'MGA'), 0)::float as du_mga,
             coalesce(sum(t.total) filter (where i.devise = 'CAD'), 0)::float as du_cad
      from invoices i
      cross join lateral (select coalesce(sum((l->>'mt')::numeric), 0) as total from jsonb_array_elements(i.lignes) l) t
      where i.statut in ('envoyee', 'retard')`);
  } catch (e) {
    return (
      <div className="err">Connexion à la base impossible : {(e as Error).message}. Vérifiez DATABASE_URL dans .env.local puis lancez « npm run db:init ».</div>
    );
  }

  const kpis: [string, React.ReactNode, string, string][] = [
    ['Membres à jour', s.a_jour, '/membres', 'ic-green'],
    ['Demandes d’adhésion', s.demandes, '/membres', 'ic-blue'],
    ['À encaisser', <>{money(s.du_mga)}{s.du_cad > 0 && <div className="small muted">+ {money(s.du_cad, 'CAD')}</div>}</>, '/paiements', 'ic-amber'],
    ['Factures en retard', s.retard, '/paiements', 'ic-red'],
    ['Événements à venir', s.events, '/evenements', 'ic-navy'],
    ['Conversations', s.threads, '/messagerie', 'ic-violet'],
    ['Abonnés à la lettre', s.abonnes, '/lettre', 'ic-blue'],
  ];
  return (
    <div className="grid g4">
      {kpis.map(([l, v, href, ic]) => (
        <Link key={l} href={href} className="card kpi" style={{ textDecoration: 'none' }}>
          <div className={`ic ${ic}`} />
          <div><div className="l">{l}</div><div className="v">{v}</div></div>
        </Link>
      ))}
    </div>
  );
}
