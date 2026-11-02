import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { q } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { money, type Row } from '@/lib/format';
import Icon from '@/components/Icon';

type Stats = { a_jour: number; demandes: number; retard: number; events: number; threads: number; abonnes: number; du_mga: number; du_cad: number };
const fDT = (d: string) => new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const ST: Record<string, string> = { a_jour: 'À jour', retard: 'En retard', attente: 'En attente de paiement', demande: 'Demande', refusee: 'Refusée' };

export default function Dashboard() {
  return (
    <>
      <div className="head"><div><div className="eyebrow">Pilotage</div><h1>Tableau de <em>bord</em></h1></div></div>
      <Suspense fallback={<div className="empty">Chargement…</div>}><Content /></Suspense>
    </>
  );
}

async function Content() {
  let user;
  try {
    user = await currentUser();
  } catch (e) {
    return <div className="err">Connexion à la base impossible : {(e as Error).message}. Vérifiez DATABASE_URL dans .env.local puis lancez « npm run db:init ».</div>;
  }
  if (!user) redirect('/connexion');

  const [[s], events, journal, messages, paid, repart] = await Promise.all([
    q<Stats>(`
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
      where i.statut in ('envoyee', 'retard')`),
    q<Row>(`select e.id, e.titre, e.date_debut, e.format, e.capacite, (select count(*) from event_registrations r where r.event_id = e.id)::int as inscrits
            from events e where date_debut >= now() order by date_debut limit 5`),
    q<Row>('select titre, detail, par, created_at from journal order by created_at desc limit 6'),
    q<Row>(`select t.sujet, m.nom, l.texte, l.de_nous, l.created_at from threads t join members m on m.id = t.member_id
            join lateral (select texte, de_nous, created_at from messages where thread_id = t.id order by created_at desc limit 1) l on true
            order by l.created_at desc limit 4`),
    q<Row>(`select i.id, i.numero, i.devise, i.mode_paiement, m.nom, (select coalesce(sum((l->>'mt')::numeric), 0) from jsonb_array_elements(i.lignes) l)::float as total
            from invoices i join members m on m.id = i.member_id where i.statut = 'payee' order by i.id desc limit 5`),
    q<Row>(`select statut, count(*)::int n, count(*) filter (where pays = 'MG')::int mg, count(*) filter (where pays = 'CA')::int ca from members group by statut`),
  ]);

  const kpis: [string, React.ReactNode, string, string, string][] = [
    ['Membres à jour', s.a_jour, '/membres', 'ic-green', 'users'],
    ['Demandes d’adhésion', s.demandes, '/membres', 'ic-blue', 'userplus'],
    ['À encaisser', <>{money(s.du_mga)}{s.du_cad > 0 && <div className="small muted">+ {money(s.du_cad, 'CAD')}</div>}</>, '/paiements', 'ic-amber', 'coin'],
    ['Factures en retard', s.retard, '/paiements', 'ic-red', 'alert'],
    ['Événements à venir', s.events, '/evenements', 'ic-navy', 'cal'],
    ['Conversations', s.threads, '/messagerie', 'ic-violet', 'chat'],
    ['Abonnés à la lettre', s.abonnes, '/lettre', 'ic-blue', 'mail'],
  ];
  const total = repart.reduce((a, r) => a + r.n, 0);
  const empty = (t: string) => <p className="small muted">{t}</p>;
  return (
    <>
      <div className="grid g4">
        {kpis.map(([l, v, href, ic, icon]) => (
          <Link key={l} href={href} className="card kpi" style={{ textDecoration: 'none' }}>
            <div className={`ic ${ic}`}><Icon name={icon} size={22} /></div>
            <div><div className="l">{l}</div><div className="v">{v}</div></div>
          </Link>
        ))}
      </div>
      <div className="grid g21">
        <div className="card">
          <div className="card-h"><h2>Prochains événements</h2><Link className="btn sm" href="/agenda">Agenda</Link></div>
          {events.length === 0 ? empty('Aucun événement à venir.') : <div className="list">{events.map(e => {
            const d = new Date(e.date_debut);
            return (
              <Link key={e.id} href={`/evenements/${e.id}`} className="it" style={{ textDecoration: 'none' }}>
                <div className="dt"><b>{d.getDate()}</b><span>{d.toLocaleDateString('fr-FR', { month: 'short' })}</span></div>
                <div className="grow"><b>{e.titre}</b><div className="small muted">{e.format} · {e.inscrits}{e.capacite ? ` / ${e.capacite}` : ''} inscrit(s)</div>
                  {e.capacite > 0 && <div className="bar" style={{ marginTop: 6 }}><i style={{ width: Math.min(100, (e.inscrits / e.capacite) * 100) + '%' }} /></div>}</div>
              </Link>
            );
          })}</div>}
        </div>
        <div className="card">
          <div className="card-h"><h2>Répartition des adhérents</h2></div>
          {total === 0 ? empty('Aucun membre pour l’instant.') : <div className="list">{repart.map(r => (
            <div key={r.statut} className="it" style={{ flexDirection: 'column', gap: 4 }}>
              <div className="row between" style={{ width: '100%' }}><b>{ST[r.statut]}</b><span className="num">{r.n}</span></div>
              <div className="bar" style={{ width: '100%' }}><i style={{ width: (r.n / total) * 100 + '%' }} /></div>
              <span className="small muted">{r.mg} à Madagascar · {r.ca} au Canada</span>
            </div>
          ))}</div>}
        </div>
      </div>
      <div className="grid g3">
        <div className="card">
          <div className="card-h"><h2>Activité récente</h2><Link className="btn sm" href="/journal">Journal</Link></div>
          {journal.length === 0 ? empty('Aucune activité.') : <div className="timeline">{journal.map((j, i) => (
            <div className="t" key={i}><b>{j.titre}</b><span className="small">{j.detail}</span><span className="small muted">{fDT(j.created_at)} · {j.par}</span></div>
          ))}</div>}
        </div>
        <div className="card">
          <div className="card-h"><div><h2>Derniers messages</h2><p className="small muted">Ce que les membres ont écrit dans le chat du support</p></div><Link className="btn sm" href="/messagerie">Messagerie</Link></div>
          {messages.length === 0 ? empty('Aucun message.') : <div className="list">{messages.map((m, i) => (
            <Link key={i} href="/messagerie" className="it" style={{ textDecoration: 'none' }}>
              <div className="grow small"><div className="row between"><b>{m.nom}</b><span className="muted">{fDT(m.created_at)}</span></div>
                <div className="muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.de_nous ? 'Vous : ' : ''}{m.texte}</div></div>
            </Link>
          ))}</div>}
        </div>
        <div className="card">
          <div className="card-h"><h2>Derniers paiements</h2><Link className="btn sm" href="/paiements">Factures</Link></div>
          {paid.length === 0 ? empty('Aucun paiement.') : <div className="list">{paid.map(p => (
            <Link key={p.id} href={`/paiements/${p.id}`} className="it" style={{ textDecoration: 'none' }}>
              <div className="grow small"><b>{p.nom}</b><div className="muted">{p.numero}{p.mode_paiement ? ' · ' + p.mode_paiement : ''}</div></div>
              <b className="num small">{money(p.total, p.devise)}</b>
            </Link>
          ))}</div>}
        </div>
      </div>
    </>
  );
}
