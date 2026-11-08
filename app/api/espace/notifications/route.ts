import { q } from '@/lib/db';
import { avecMembre } from '@/lib/espace';
import { conversations } from '@/lib/espace-donnees';
import type { Row } from '@/lib/format';
import { progression } from '@/lib/maillage';

// Cloche de l'espace membre : ce qui attend le membre (messages, factures, questionnaire, événements proches)
// et les nouveautés de la Chambre (actualités, événements annoncés). Le navigateur retient ce qui a déjà été vu.
export const GET = () => avecMembre(async m => {
  const [convs, factures, [mg], proches, actus, evs] = await Promise.all([
    conversations(m),
    q<Row>(`select id, numero, echeance, statut, date_emission from invoices where member_id = $1 and statut in ('envoyee', 'retard') order by echeance nulls last`, [m.member_id]),
    q<Row>('select reponses from maillage where member_id = $1', [m.member_id]),
    q<Row>(`select e.id, e.titre, e.date_debut from events e where e.date_debut between now() and now() + interval '7 days'
              and exists (select 1 from event_registrations r where r.event_id = e.id and r.member_id = $1 and lower(r.email) = lower($2)) order by e.date_debut`, [m.member_id, m.email]),
    q<Row>(`select id, titre, coalesce(date_pub, created_at) as quand from news where publie and coalesce(date_pub, created_at) > now() - interval '21 days' order by quand desc limit 5`),
    q<Row>(`select id, titre, date_debut, created_at from events where date_debut > now() and created_at > now() - interval '21 days' order by created_at desc limit 5`),
  ]);
  const jour = (v: string) => new Date(v).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const items: Row[] = [
    ...convs.filter((c: Row) => c.non_lu).map((c: Row) => ({ cle: `msg-${c.id}-${c.dernier_at}`, icone: 'chat', texte: `Nouveau message de la Chambre${c.sujet ? ` : ${c.sujet}` : ''}`, quand: c.dernier_at, lien: '/espace/messagerie', afaire: true })),
    ...factures.map(f => ({ cle: `fac-${f.id}-${f.statut}`, icone: f.statut === 'retard' ? 'alert' : 'coin', texte: f.statut === 'retard' ? `La facture ${f.numero} est en retard` : `Facture ${f.numero} à régler${f.echeance ? ` avant le ${new Date(f.echeance).toLocaleDateString('fr-FR')}` : ''}`, quand: f.date_emission, lien: `/espace/factures/${f.id}`, afaire: true })),
    ...proches.map(e => ({ cle: `ev-proche-${e.id}`, icone: 'cal', texte: `Rappel : « ${e.titre} » ${jour(e.date_debut)}`, quand: e.date_debut, lien: `/espace/evenements/${e.id}`, afaire: true })),
    ...actus.map(n => ({ cle: `actu-${n.id}`, icone: 'news', texte: `Nouvelle actualité : ${n.titre}`, quand: n.quand, lien: `/espace/actualites?id=${n.id}` })),
    ...evs.map(e => ({ cle: `ev-${e.id}`, icone: 'cal', texte: `Nouvel événement : ${e.titre}`, quand: e.created_at, lien: `/espace/evenements/${e.id}` })),
  ];
  const mp = progression(mg?.reponses ?? {});
  if (mp.pct < 100) items.push({ cle: 'maillage', icone: 'list', texte: `Questionnaire de maillage : ${mp.faites}/${mp.total} réponses. Complétez-le pour être mis en relation.`, quand: null, lien: '/espace/maillage', afaire: true });
  return Response.json(items.sort((a, b) => Number(!!b.afaire) - Number(!!a.afaire) || String(b.quand ?? '').localeCompare(String(a.quand ?? ''))));
});
