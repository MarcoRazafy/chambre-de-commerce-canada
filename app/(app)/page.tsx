import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { q } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { money, type Row } from '@/lib/format';
import Icon from '@/components/Icon';
import { ColumnChart, HBarList, Ring, SegmentBar, type Point } from '@/components/Charts';

type K = {
  adherents: number; a_jour: number; nouveaux_mois: number; demandes: number;
  enc_annee_mga: number; enc_annee_cad: number; enc_mois_mga: number; enc_mois_prec_mga: number;
  du_mga: number; du_cad: number; nb_du: number; retard: number; retard_mga: number;
  payees_12m: number; emises_12m: number;
  events: number; inscrits: number; places: number;
  abonnes: number; ouverture: number | null; nouveaux_abonnes: number;
};
const fDT = (d: string) => new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const compact = (v: number) => new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
const STATUTS: [string, string, string][] = [['a_jour', 'À jour', 'c-green'], ['attente', 'En attente de paiement', 'c-amber'], ['retard', 'En retard', 'c-red'], ['demande', 'Demande', 'c-blue']];

// Les 12 derniers mois, du plus ancien au mois en cours
function last12() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) };
  });
}

export default function Dashboard() {
  return <Suspense fallback={<div className="empty">Chargement…</div>}><Content /></Suspense>;
}

async function Content() {
  let user;
  try {
    user = await currentUser();
  } catch (e) {
    return <div className="err">Connexion à la base impossible : {(e as Error).message}. Vérifiez DATABASE_URL dans .env.local puis lancez « npm run db:init ».</div>;
  }
  if (!user) redirect('/connexion');

  const TOTAL = `(select coalesce(sum((l->>'mt')::numeric), 0) from jsonb_array_elements(i.lignes) l)`;
  // Paiements datés par l'historique de la facture (« Paiement enregistré … »)
  const PAID = `select (h->>'d')::timestamptz as d, i.devise, ${TOTAL} as mt from invoices i cross join lateral jsonb_array_elements(i.historique) h
                where i.statut = 'payee' and h->>'t' like 'Paiement enregistré%'`;
  const [[k], encMois, adhMois, statuts, secteurs, pays, events, journal, messages, paid] = await Promise.all([
    q<K>(`
      select (select count(*) from members where statut in ('a_jour', 'retard', 'attente'))::int as adherents,
             (select count(*) from members where statut = 'a_jour')::int as a_jour,
             (select count(*) from members where membre_depuis >= date_trunc('month', now()))::int as nouveaux_mois,
             (select count(*) from members where statut = 'demande')::int as demandes,
             (select coalesce(sum(mt), 0) from (${PAID}) p where devise = 'MGA' and d >= date_trunc('year', now()))::float as enc_annee_mga,
             (select coalesce(sum(mt), 0) from (${PAID}) p where devise = 'CAD' and d >= date_trunc('year', now()))::float as enc_annee_cad,
             (select coalesce(sum(mt), 0) from (${PAID}) p where devise = 'MGA' and d >= date_trunc('month', now()))::float as enc_mois_mga,
             (select coalesce(sum(mt), 0) from (${PAID}) p where devise = 'MGA' and d >= date_trunc('month', now()) - interval '1 month' and d < date_trunc('month', now()))::float as enc_mois_prec_mga,
             (select coalesce(sum(${TOTAL}), 0) from invoices i where statut in ('envoyee', 'retard') and devise = 'MGA')::float as du_mga,
             (select coalesce(sum(${TOTAL}), 0) from invoices i where statut in ('envoyee', 'retard') and devise = 'CAD')::float as du_cad,
             (select count(*) from invoices where statut in ('envoyee', 'retard'))::int as nb_du,
             (select count(*) from invoices where statut = 'retard')::int as retard,
             (select coalesce(sum(${TOTAL}), 0) from invoices i where statut = 'retard' and devise = 'MGA')::float as retard_mga,
             (select count(*) from invoices where statut = 'payee' and date_emission >= current_date - 365)::int as payees_12m,
             (select count(*) from invoices where statut in ('payee', 'envoyee', 'retard') and date_emission >= current_date - 365)::int as emises_12m,
             (select count(*) from events where date_debut >= now())::int as events,
             (select count(*) from event_registrations r join events e on e.id = r.event_id where e.date_debut >= now())::int as inscrits,
             (select coalesce(sum(capacite), 0) from events where date_debut >= now())::int as places,
             (select count(*) from subscribers where statut = 'Abonné')::int as abonnes,
             (select avg(taux_ouverture) from campaigns where statut = 'Envoyée')::float as ouverture,
             (select count(*) from subscribers where date_inscription >= current_date - 30)::int as nouveaux_abonnes`),
    q<{ m: string; total: number; n: number }>(`select to_char(date_trunc('month', d), 'YYYY-MM') as m, sum(mt)::float as total, count(*)::int as n
      from (${PAID}) p where devise = 'MGA' and d >= date_trunc('month', now()) - interval '11 months' group by 1`),
    q<{ m: string; n: number }>(`select to_char(date_trunc('month', membre_depuis), 'YYYY-MM') as m, count(*)::int as n from members
      where membre_depuis >= date_trunc('month', now()) - interval '11 months' group by 1`),
    q<{ statut: string; n: number }>(`select statut, count(*)::int as n from members group by statut`),
    q<{ label: string; value: number }>(`select coalesce(s.nom, 'Non renseigné') as label, count(*)::int as value from members m left join secteurs s on s.id = m.secteur_id
      where m.statut in ('a_jour', 'retard', 'attente') group by 1 order by 2 desc, 1 limit 6`),
    q<{ pays: string; n: number }>(`select pays, count(*)::int as n from members where statut in ('a_jour', 'retard', 'attente') group by pays`),
    q<Row>(`select e.id, e.titre, e.date_debut, e.format, e.capacite, (select count(*) from event_registrations r where r.event_id = e.id)::int as inscrits
            from events e where date_debut >= now() order by date_debut limit 4`),
    q<Row>('select titre, detail, par, created_at from journal order by created_at desc limit 5'),
    q<Row>(`select t.id, coalesce(m.nom, nullif(t.sujet, ''), 'Groupe') as nom, l.texte, l.de_nous, l.created_at from threads t left join members m on m.id = t.member_id
            join lateral (select texte, de_nous, created_at from messages where thread_id = t.id and deleted_at is null order by created_at desc limit 1) l on true
            where t.type = 'membre' or exists (select 1 from thread_participants p where p.thread_id = t.id and p.member_id is not null)
            order by l.created_at desc limit 4`),
    q<Row>(`select i.id, i.numero, i.devise, i.mode_paiement, m.nom, ${TOTAL}::float as total
            from invoices i join members m on m.id = i.member_id where i.statut = 'payee' order by i.id desc limit 4`),
  ]);

  const months = last12();
  const encData: Point[] = months.map(mo => {
    const r = encMois.find(x => x.m === mo.key);
    return { ...mo, value: r?.total ?? 0, tip: r ? `${money(r.total)} · ${r.n} paiement(s)` : 'Aucun paiement' };
  });
  const adhData: Point[] = months.map(mo => {
    const n = adhMois.find(x => x.m === mo.key)?.n ?? 0;
    return { ...mo, value: n, tip: `${n} nouvel adhérent${n > 1 ? 's' : ''}` };
  });
  const recouvrement = k.emises_12m ? (k.payees_12m / k.emises_12m) * 100 : 0;
  // Comparaison avec le mois précédent, seulement quand ce mois-ci a déjà des encaissements (sinon « −100 % » le 1er du mois)
  const evolution = k.enc_mois_prec_mga && k.enc_mois_mga ? Math.round(((k.enc_mois_mga - k.enc_mois_prec_mga) / k.enc_mois_prec_mga) * 100) : null;
  const totalMembres = statuts.reduce((a, s) => a + s.n, 0);
  const mg = pays.find(p => p.pays === 'MG')?.n ?? 0, ca = pays.find(p => p.pays === 'CA')?.n ?? 0;
  const prenom = user.nom.split(' ')[0];
  const jour = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const empty = (t: string) => <p className="small muted">{t}</p>;

  const tiles: { label: string; value: React.ReactNode; sub: React.ReactNode; href: string; icon: string}[] = [
    { label: 'Adhérents', value: k.adherents, sub: <>{k.a_jour} à jour{k.nouveaux_mois ? <> · <b>+{k.nouveaux_mois}</b> ce mois</> : ''}</>, href: '/membres', icon: 'users' },
    { label: `Encaissé en ${new Date().getFullYear()}`, value: money(k.enc_annee_mga), sub: <>{k.enc_annee_cad > 0 && <>+ {money(k.enc_annee_cad, 'CAD')} · </>}{money(k.enc_mois_mga)} ce mois</>, href: '/paiements', icon: 'coin' },
    { label: 'Reste à encaisser', value: money(k.du_mga), sub: <>{k.du_cad > 0 && <>+ {money(k.du_cad, 'CAD')} · </>}{k.nb_du} facture(s)</>, href: '/paiements', icon: 'file' },
    { label: 'Factures en retard', value: k.retard, sub: k.retard ? <>{money(k.retard_mga)} en souffrance</> : 'Aucun retard', href: '/paiements', icon: 'alert' },
    { label: 'Demandes d’adhésion', value: k.demandes, sub: k.demandes ? 'À examiner' : 'Rien à traiter', href: '/membres', icon: 'userplus' },
    { label: 'Événements à venir', value: k.events, sub: <>{k.inscrits} inscrit(s){k.places ? ` sur ${k.places} places` : ''}</>, href: '/evenements', icon: 'cal' },
    { label: 'Abonnés à la lettre', value: k.abonnes, sub: <>{k.nouveaux_abonnes ? <><b>+{k.nouveaux_abonnes}</b> en 30 jours · </> : ''}{k.ouverture != null ? `${Math.round(k.ouverture)} % d’ouverture` : 'Aucune lettre envoyée'}</>, href: '/lettre', icon: 'mail' },
    { label: 'Taux de recouvrement', value: `${Math.round(recouvrement)} %`, sub: `${k.payees_12m} facture(s) payée(s) sur ${k.emises_12m} en 12 mois`, href: '/paiements', icon: 'ok' },
  ];

  return (
    <>
      <div className="head dash-head">
        <div><div className="eyebrow" style={{ textTransform: 'capitalize' }}>{jour}</div><h1>Bonjour, {prenom}</h1>
          <p className="muted">Voici où en est la Chambre aujourd’hui.</p></div>
        <div className="actions">
          <Link className="btn" href="/evenements"><Icon name="cal" size={16} /> Événements</Link>
          <Link className="btn" href="/messagerie"><Icon name="compose" size={16} /> Nouveau message</Link>
          <Link className="btn cta" href="/paiements"><Icon name="plus" size={16} /> Nouvelle facture</Link>
        </div>
      </div>

      <div className="grid g4">
        {tiles.map(t => (
          <Link key={t.label} href={t.href} className="card stat">
            <div className="stat-h"><span className="stat-l">{t.label}</span><span className="stat-ic"><Icon name={t.icon} size={18} /></span></div>
            <div className="stat-v num">{t.value}</div>
            <div className="stat-s">{t.sub}</div>
          </Link>
        ))}
      </div>

      <div className="grid g21">
        <div className="card">
          <div className="card-h"><div><h2>Encaissements</h2><p className="small muted">Paiements en ariary reçus chaque mois, sur 12 mois</p></div>
            <div className="dash-kpi"><b className="num">{money(k.enc_mois_mga)}</b><span className="small muted">ce mois{evolution !== null && <> · <span className={evolution >= 0 ? 'up' : 'down'}>{evolution >= 0 ? '+' : ''}{evolution} %</span> vs le mois dernier</>}</span></div></div>
          <ColumnChart data={encData} format={v => compact(v)} title="Encaissements mensuels en ariary" />
        </div>
        <div className="card">
          <div className="card-h"><div><h2>Recouvrement</h2><p className="small muted">Factures des 12 derniers mois</p></div></div>
          <div className="recouv">
            <Ring value={recouvrement} label="payées" />
            <dl className="kv recouv-kv">
              <dt>Payées</dt><dd className="num">{k.payees_12m}</dd>
              <dt>À encaisser</dt><dd className="num">{money(k.du_mga)}</dd>
              <dt>Dont en retard</dt><dd className="num">{money(k.retard_mga)}</dd>
            </dl>
          </div>
          <Link className="btn sm" href="/paiements" style={{ alignSelf: 'flex-start' }}>Voir les factures</Link>
        </div>
      </div>

      <div className="grid g2">
        <div className="card">
          <div className="card-h"><div><h2>Nouveaux adhérents</h2><p className="small muted">Adhésions validées chaque mois, sur 12 mois</p></div>
            <div className="dash-kpi"><b className="num">{adhData.reduce((a, d) => a + d.value, 0)}</b><span className="small muted">en 12 mois</span></div></div>
          <ColumnChart data={adhData} format={v => String(Math.round(v))} title="Nouveaux adhérents par mois" height={160} integer />
        </div>
        <div className="card">
          <div className="card-h"><div><h2>Adhérents</h2><p className="small muted">{totalMembres} membre(s) et demande(s) · {mg} à Madagascar, {ca} au Canada</p></div></div>
          {totalMembres === 0 ? empty('Aucun membre pour l’instant.') : (
            <>
              <SegmentBar segments={STATUTS.map(([v, l, tone]) => ({ label: l, value: statuts.find(s => s.statut === v)?.n ?? 0, tone }))} />
              <h3 className="small muted" style={{ marginTop: 6 }}>Principaux secteurs</h3>
              <HBarList items={secteurs} total={k.adherents} />
            </>
          )}
        </div>
      </div>

      <div className="grid g21">
        <div className="card">
          <div className="card-h"><h2>Prochains événements</h2><Link className="btn sm" href="/agenda">Agenda</Link></div>
          {events.length === 0 ? empty('Aucun événement à venir.') : <div className="list">{events.map(e => {
            const d = new Date(e.date_debut), pct = e.capacite ? Math.min(100, (e.inscrits / e.capacite) * 100) : 0;
            return (
              <Link key={e.id} href={`/evenements/${e.id}`} className="it" style={{ textDecoration: 'none' }}>
                <div className="dt"><span>{d.toLocaleDateString('fr-FR', { weekday: 'short' })}</span><b>{d.getDate()}</b></div>
                <div className="grow"><b>{e.titre}</b><div className="small muted">{d.toLocaleDateString('fr-FR', { month: 'long' })}, {d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · {e.format} · {e.inscrits}{e.capacite ? ` / ${e.capacite}` : ''} inscrit(s){e.capacite ? ` · ${Math.round(pct)} % rempli` : ''}</div>
                  {e.capacite > 0 && <div className="bar" style={{ marginTop: 6 }}><i style={{ width: pct + '%' }} /></div>}</div>
              </Link>
            );
          })}</div>}
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

      <div className="grid g2">
        <div className="card">
          <div className="card-h"><h2>Activité récente</h2><Link className="btn sm" href="/journal">Journal</Link></div>
          {journal.length === 0 ? empty('Aucune activité.') : <div className="timeline">{journal.map((j, i) => (
            <div className="t" key={i}><b>{j.titre}</b><span className="small">{j.detail}</span><span className="small muted">{fDT(j.created_at)} · {j.par}</span></div>
          ))}</div>}
        </div>
        <div className="card">
          <div className="card-h"><div><h2>Derniers messages</h2><p className="small muted">Conversations avec les membres</p></div><Link className="btn sm" href="/messagerie">Messagerie</Link></div>
          {messages.length === 0 ? empty('Aucun message.') : <div className="list">{messages.map(m => (
            <Link key={m.id} href={`/messagerie?c=${m.id}`} className="it" style={{ textDecoration: 'none' }}>
              <div className="grow small"><div className="row between"><b>{m.nom}</b><span className="muted">{fDT(m.created_at)}</span></div>
                <div className="muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.de_nous ? 'L’équipe : ' : ''}{m.texte || '📎 Pièce jointe'}</div></div>
            </Link>
          ))}</div>}
        </div>
      </div>
    </>
  );
}
