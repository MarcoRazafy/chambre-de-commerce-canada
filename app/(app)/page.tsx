import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { q } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { unreadCount } from '@/lib/messaging';
import { money, type Row } from '@/lib/format';
import Icon from '@/components/Icon';
import Avatar from '@/components/Avatar';
import { ColumnChart, HBarList, SegmentBar, type Point } from '@/components/Charts';

type K = {
  adherents: number; a_jour: number; nouveaux_mois: number; ev_avenir: number;
  enc_annee_mga: number; enc_annee_cad: number; enc_mois_mga: number;
  du_mga: number; du_cad: number; nb_du: number; payees_12m: number; emises_12m: number;
  abonnes: number; ouverture: number | null; nouveaux_abonnes: number;
};
type Todo = { icon: string; tone: string; titre: string; detail: string; href: string };
const compact = (v: number) => new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
const STATUTS: [string, string, string][] = [['a_jour', 'À jour', 'c-green'], ['attente', 'En attente de paiement', 'c-amber'], ['retard', 'En retard', 'c-red'], ['demande', 'Demande', 'c-blue']];
const pl = (n: number, mot: string, pluriel = mot + 's') => `${n} ${n > 1 ? pluriel : mot}`;
const ilya = (d: string) => {
  const j = Math.floor((Date.now() - new Date(d).getTime()) / 864e5);
  return j <= 0 ? 'aujourd’hui' : j === 1 ? 'hier' : `il y a ${j} jours`;
};

// Les 12 derniers mois, du plus ancien au mois en cours
function last12() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) };
  });
}

export default function Accueil() {
  return <Suspense fallback={<div className="card"><div className="skeleton"><span /><span /><span /></div></div>}><Content /></Suspense>;
}

// Accueil de la maquette « Propositions UX » : d'abord ce qui demande une action, puis 4 chiffres clés et les tendances
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
  const [[k], encMois, adhMois, statuts, secteurs, events, messages, demandes, reglements, retards, jamais, nonLus] = await Promise.all([
    q<K>(`
      select (select count(*) from members where statut in ('a_jour', 'retard', 'attente'))::int as adherents,
             (select count(*) from events where date_debut >= now())::int as ev_avenir,
             (select count(*) from members where statut = 'a_jour')::int as a_jour,
             (select count(*) from members where membre_depuis >= date_trunc('month', now()))::int as nouveaux_mois,
             (select coalesce(sum(mt), 0) from (${PAID}) p where devise = 'MGA' and d >= date_trunc('year', now()))::float as enc_annee_mga,
             (select coalesce(sum(mt), 0) from (${PAID}) p where devise = 'CAD' and d >= date_trunc('year', now()))::float as enc_annee_cad,
             (select coalesce(sum(mt), 0) from (${PAID}) p where devise = 'MGA' and d >= date_trunc('month', now()))::float as enc_mois_mga,
             (select coalesce(sum(${TOTAL}), 0) from invoices i where statut in ('envoyee', 'retard') and devise = 'MGA')::float as du_mga,
             (select coalesce(sum(${TOTAL}), 0) from invoices i where statut in ('envoyee', 'retard') and devise = 'CAD')::float as du_cad,
             (select count(*) from invoices where statut in ('envoyee', 'retard'))::int as nb_du,
             (select count(*) from invoices where statut = 'payee' and date_emission >= current_date - 365)::int as payees_12m,
             (select count(*) from invoices where statut in ('payee', 'envoyee', 'retard') and date_emission >= current_date - 365)::int as emises_12m,
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
    q<Row>(`select e.id, e.titre, e.date_debut, e.format, e.capacite, (select count(*) from event_registrations r where r.event_id = e.id)::int as inscrits
            from events e where date_debut >= now() order by date_debut limit 3`),
    q<Row>(`select t.id, coalesce(m.nom, nullif(t.sujet, ''), 'Groupe') as nom, t.member_id, l.texte, l.de_nous, l.created_at from threads t left join members m on m.id = t.member_id
            join lateral (select texte, de_nous, created_at from messages where thread_id = t.id and deleted_at is null order by created_at desc limit 1) l on true
            order by l.created_at desc limit 4`),
    q<Row>(`select nom, created_at from members where statut = 'demande' order by created_at desc`),
    q<Row>(`select reference, moyen, annonce_le from reglements where statut = 'annoncé' order by annonce_le`),
    q<Row>(`select coalesce(m.nom, i.destinataire_nom, 'Client') as nom, i.devise, ${TOTAL}::float as total, i.echeance from invoices i left join members m on m.id = i.member_id
            where i.statut = 'retard' order by i.echeance nulls last`),
    q<Row>(`select nom, fonction from team_users where actif and derniere_connexion is null order by nom`),
    unreadCount(user),
  ]);

  // À faire : seulement ce qui demande une action, chaque ligne mène au bon écran
  const todo: Todo[] = [];
  if (demandes.length) todo.push({ icon: 'userplus', tone: 'blue', titre: `${pl(demandes.length, 'demande')} d’adhésion à examiner`,
    detail: `${demandes[0].nom} · déposée ${ilya(demandes[0].created_at)}${demandes.length > 1 ? ` · et ${demandes.length - 1} autre${demandes.length > 2 ? 's' : ''}` : ''}`, href: '/membres?statut=demande' });
  if (reglements.length) todo.push({ icon: 'coin', tone: 'amber', titre: `${pl(reglements.length, 'règlement')} annoncé${reglements.length > 1 ? 's' : ''} à vérifier`,
    detail: `Réf. ${reglements[0].reference}${reglements[0].moyen ? ` · ${reglements[0].moyen}` : ''} · annoncé ${ilya(reglements[0].annonce_le)}`, href: '/reglements' });
  if (retards.length) {
    const r = retards[0], jours = r.echeance ? Math.max(0, Math.floor((Date.now() - new Date(r.echeance).getTime()) / 864e5)) : null;
    todo.push({ icon: 'alert', tone: 'red', titre: `${pl(retards.length, 'facture')} en retard`,
      detail: `${r.nom} · ${money(r.total, r.devise)}${jours !== null ? ` · ${jours} jours` : ''}`, href: '/paiements' });
  }
  if (nonLus) todo.push({ icon: 'chat', tone: 'violet', titre: `${pl(nonLus, 'conversation')} non lue${nonLus > 1 ? 's' : ''}`, detail: 'Dans la messagerie', href: '/messagerie' });
  if (jamais.length) todo.push({ icon: 'user', tone: 'grey', titre: `${pl(jamais.length, 'compte')} d’équipe jamais connecté${jamais.length > 1 ? 's' : ''}`,
    detail: jamais.slice(0, 3).map(j => j.fonction || j.nom).join(', ') + (jamais.length > 3 ? '…' : ''), href: '/abonnement' });

  const months = last12();
  const encData: Point[] = months.map(mo => {
    const r = encMois.find(x => x.m === mo.key);
    return { ...mo, value: r?.total ?? 0, tip: r ? `${money(r.total)} · ${r.n} paiement(s)` : 'Aucun paiement' };
  });
  const adhData: Point[] = months.map(mo => {
    const n = adhMois.find(x => x.m === mo.key)?.n ?? 0;
    return { ...mo, value: n, tip: `${n} nouvel adhérent${n > 1 ? 's' : ''}` };
  });
  const recouvrement = k.emises_12m ? Math.round((k.payees_12m / k.emises_12m) * 100) : 0;
  const totalMembres = statuts.reduce((a, s) => a + s.n, 0);
  const prenom = user.nom.split(/\s+/)[0];
  const jour = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const kpis: { label: string; value: React.ReactNode; sub: React.ReactNode; href: string }[] = [
    { label: 'Adhérents', value: k.adherents, sub: <>{k.a_jour} à jour{k.nouveaux_mois ? <> · <b>+{k.nouveaux_mois}</b> ce mois</> : ''}</>, href: '/membres' },
    { label: `Encaissé en ${new Date().getFullYear()}`, value: money(k.enc_annee_mga), sub: <>{k.enc_annee_cad > 0 && <>+ {money(k.enc_annee_cad, 'CAD')} · </>}{money(k.enc_mois_mga)} ce mois</>, href: '/paiements' },
    { label: 'Reste à encaisser', value: money(k.du_mga), sub: <>{k.du_cad > 0 && <>+ {money(k.du_cad, 'CAD')} · </>}{pl(k.nb_du, 'facture')} · recouvrement {recouvrement} %</>, href: '/paiements' },
    { label: 'Newsletter', value: pl(k.abonnes, 'abonné'), sub: <>{k.nouveaux_abonnes ? <>+{k.nouveaux_abonnes} en 30 jours · </> : ''}{k.ouverture != null ? `${Math.round(k.ouverture)} % d’ouverture` : 'aucune lettre envoyée'}</>, href: '/newsletter' },
  ];

  return (
    <>
      {/* Bandeau de la charte : marine et dégradé orange, trois chiffres en un coup d'œil */}
      <div className="hero">
        <div style={{ position: 'relative', zIndex: 1 }}><div className="eyebrow">{jour}</div><h1>Bonjour <em>{prenom}</em>,</h1><p>Voici ce qui demande votre attention aujourd’hui.</p></div>
        <div className="hero-stats">
          <span><b className="num">{k.adherents}</b>adhérents</span>
          <span><b className="num">{money(k.enc_annee_mga)}</b>encaissés en {new Date().getFullYear()}</span>
          <span><b className="num">{k.ev_avenir}</b>événement{k.ev_avenir > 1 ? 's' : ''} à venir</span>
        </div>
      </div>

      <div className="grid g21">
        <section className="card">
          <div className="card-h"><h2>À faire aujourd’hui {todo.length > 0 && <span className="chip-n">{todo.length}</span>}</h2><span className="small muted">Cliquez pour traiter</span></div>
          {todo.length ? (
            <div className="list todo">
              {todo.map(t => (
                <Link key={t.titre} href={t.href} className="it">
                  <span className={`todo-ic ${t.tone}`}><Icon name={t.icon} size={18} /></span>
                  <span className="grow"><b className="small">{t.titre}</b><span className="small muted">{t.detail}</span></span>
                  <Icon name="caret" size={16} />
                </Link>
              ))}
            </div>
          ) : <div className="todo-ok"><span className="todo-ic green"><Icon name="ok" size={18} /></span><b>Rien à traiter pour le moment.</b><span className="small muted">Demandes, règlements, retards et messages sont à jour.</span></div>}
        </section>
        <section className="card">
          <div className="card-h"><h2>Prochains événements</h2><Link className="btn sm" href="/evenements">Tous les événements</Link></div>
          {events.length === 0 ? <p className="small muted">Aucun événement à venir.</p> : (
            <div className="list">{events.map(e => {
              const d = new Date(e.date_debut), pct = e.capacite ? Math.min(100, (e.inscrits / e.capacite) * 100) : 0;
              return (
                <Link key={e.id} href={`/evenements/${e.id}`} className="it ev-it">
                  <span className="dt-cal"><span>{d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</span><b>{d.getDate()}</b></span>
                  <span className="grow"><b className="small">{e.titre}</b>
                    {e.capacite > 0 && <span className="bar ev-bar"><i style={{ width: pct + '%' }} /></span>}
                    <span className="small muted">{e.inscrits}{e.capacite ? `/${e.capacite}` : ''} inscrit{e.inscrits > 1 ? 's' : ''} · {e.format}</span></span>
                </Link>
              );
            })}</div>
          )}
        </section>
      </div>

      <div className="grid g4">
        {kpis.map(t => (
          <Link key={t.label} href={t.href} className="card kpi4">
            <span className="eyebrow">{t.label}</span>
            <span className="kpi4-v num">{t.value}</span>
            <span className="small muted">{t.sub}</span>
          </Link>
        ))}
      </div>

      <section className="card">
        <div className="card-h"><h2>Encaissements sur 12 mois</h2><span className="small muted">Paiements en ariary reçus chaque mois</span></div>
        <ColumnChart data={encData} format={v => compact(v)} title="Encaissements mensuels en ariary" />
      </section>

      <div className="grid g2">
        <section className="card">
          <div className="card-h"><h2>Nouveaux adhérents</h2><span className="small muted">{adhData.reduce((a, d) => a + d.value, 0)} en 12 mois</span></div>
          <ColumnChart data={adhData} format={v => String(Math.round(v))} title="Nouveaux adhérents par mois" height={160} integer />
        </section>
        <section className="card">
          <div className="card-h"><h2>Adhérents</h2><span className="small muted">{totalMembres} membres et demandes</span></div>
          {totalMembres === 0 ? <p className="small muted">Aucun membre pour l’instant.</p> : (
            <>
              <SegmentBar segments={STATUTS.map(([v, l, tone]) => ({ label: l, value: statuts.find(s => s.statut === v)?.n ?? 0, tone }))} />
              <h3 className="small muted" style={{ marginTop: 6 }}>Principaux secteurs</h3>
              <HBarList items={secteurs} total={k.adherents} />
            </>
          )}
        </section>
      </div>

      <section className="card">
        <div className="card-h"><div><h2>Derniers messages</h2><span className="small muted">Conversations avec les membres et l’équipe</span></div><Link className="btn sm" href="/messagerie">Toute la messagerie</Link></div>
        {messages.length === 0 ? <p className="small muted">Aucun message.</p> : (
          <div className="list">{messages.map(m => (
            <Link key={m.id} href={`/messagerie?c=${m.id}`} className="it msg-it">
              {m.member_id ? <Avatar kind="member" id={m.member_id} size={38} nom={m.nom} /> : <span className="msg-ini">{m.nom.slice(0, 1).toUpperCase()}</span>}
              <span className="grow"><span className="row between"><b className="small">{m.nom}</b><span className="small muted">{new Date(m.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span></span>
                <span className="small muted msg-prev">{m.de_nous ? 'Vous : ' : ''}{m.texte || '📎 Pièce jointe'}</span></span>
            </Link>
          ))}</div>
        )}
      </section>
    </>
  );
}
