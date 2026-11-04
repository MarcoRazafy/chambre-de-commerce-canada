// Tâches automatiques, lancées toutes les 10 minutes par instrumentation.ts
// (ou par /api/cron). Chaque envoi porte une ref unique : rien n'est envoyé deux fois.
import { pool, q } from './db';
import { journal, notify } from './hooks';
import { sendEmail } from './mail';
import { createInvoice, getSettings, remindInvoice, sendCampaign, sendOutbox } from './business';
import type { Row } from './format';

const SYS = 'Automatique';
const STEPS: [key: string, offset: number][] = [['avant30', -30], ['avant7', -7], ['apres1', 1], ['apres7', 7], ['apres15', 15], ['apres30', 30]];
const STEP_LABEL: Record<string, string> = {
  avant30: '30 jours avant l’échéance', avant7: '7 jours avant l’échéance', apres1: 'le lendemain de l’échéance',
  apres7: '7 jours après l’échéance', apres15: '15 jours après l’échéance', apres30: '30 jours après l’échéance',
};

async function safe(label: string, fn: () => Promise<unknown>) {
  try { await fn(); } catch (e) { console.error(`[tâches] ${label} :`, (e as Error).message); }
}

export async function runJobs() {
  // Un seul passage à la fois, même avec plusieurs instances du serveur
  const client = await pool.connect();
  try {
    const { rows: [{ ok }] } = await client.query('select pg_try_advisory_lock(424242) as ok');
    if (!ok) return;
    try { await run(); } finally { await client.query('select pg_advisory_unlock(424242)'); }
  } finally {
    client.release();
  }
}

async function run() {
  const rel = await getSettings('relances');

  // 1. Factures échues → en retard (activé par défaut)
  if (rel.autoRetard !== false) await safe('retards', async () => {
    const late = await q<Row>(`update invoices set statut = 'retard', historique = historique || jsonb_build_array(jsonb_build_object('d', now(), 't', 'Passée en retard automatiquement à l’échéance'))
                               where statut = 'envoyee' and echeance < current_date returning *`);
    for (const inv of late) {
      const [m] = await q<Row>('select nom from members where id = $1', [inv.member_id]);
      if (inv.objet === 'cotisation') await q(`update members set statut = 'retard' where id = $1 and statut in ('a_jour', 'attente')`, [inv.member_id]);
      await notify(`Facture ${inv.numero} passée en retard (${m?.nom ?? ''})`, `/paiements/${inv.id}`, { member: inv.member_id, icon: 'alert' });
      await journal('Paiements', 'Facture passée en retard', `${inv.numero}, ${m?.nom ?? ''}`, SYS);
    }
  });

  // 2. Relances selon les réglages : seule la dernière étape atteinte est envoyée
  const steps = STEPS.filter(([k]) => rel[k]);
  if (steps.length && (rel.courriel || rel.notif)) await safe('relances', async () => {
    const invs = await q<Row>(`select id, numero, member_id, (current_date - echeance) as d from invoices where statut in ('envoyee', 'retard')`);
    for (const inv of invs) {
      const step = steps.filter(([, off]) => off <= inv.d).at(-1);
      if (!step) continue;
      if (rel.courriel) await safe(`relance ${inv.numero}`, () => remindInvoice(inv.id, SYS, `inv:${inv.id}:${step[0]}`));
      if (rel.notif && (await q(`insert into outbox (type, sujet, statut, ref) values ('notification', $1, 'envoyé', $2) on conflict (ref) do nothing returning id`,
        [`Relance ${inv.numero}`, `notif:${inv.id}:${step[0]}`])).length)
        await notify(`Relance de la facture ${inv.numero}, ${STEP_LABEL[step[0]]}`, `/paiements/${inv.id}`, { member: inv.member_id, icon: 'mail' });
    }
  });

  // 3. Renouvellements : facture de cotisation 30 jours avant la date de renouvellement
  await safe('renouvellements', async () => {
    const due = await q<Row>(`
      select m.id, m.nom, m.renouvellement, f.nom as formule, f.prix, f.devise from members m join formules f on f.id = m.formule_id
      where m.statut = 'a_jour' and m.renouvellement <= current_date + 30 and f.prix is not null
        and not exists (select 1 from invoices i where i.member_id = m.id and i.objet = 'cotisation' and i.date_emission > m.renouvellement - 45)`);
    for (const m of due)
      await createInvoice({ member_id: m.id, objet: 'cotisation', lignes: [{ des: `Renouvellement de la cotisation annuelle (${m.formule})`, mt: m.prix }],
        devise: m.devise, echeance: m.renouvellement, par: SYS, intro: 'Votre adhésion arrive à échéance. Voici la facture de renouvellement de votre cotisation.' });
  });

  // 4. Rappels aux inscrits des événements (J-7, veille, 2 h avant)
  await safe('rappels événements', async () => {
    const evs = await q<Row>(`select *, extract(epoch from date_debut - now()) / 3600 as h from events where date_debut > now() and date_debut < now() + interval '8 days'`);
    for (const e of evs) {
      const step = e.rappel_h2 && e.h <= 2 ? 'h2' : e.rappel_j1 && e.h <= 24 ? 'j1' : e.rappel_j7 && e.h <= 168 ? 'j7' : null;
      if (!step) continue;
      const to = (await q<{ email: string }>('select email from event_registrations where event_id = $1', [e.id])).map(r => r.email);
      const quand = new Date(e.date_debut).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: process.env.TZ || 'Indian/Antananarivo' });
      await sendEmail({ to, subject: `Rappel : ${e.titre}`, ref: `evt:${e.id}:${step}`,
        text: `Bonjour,\n\nPetit rappel : vous êtes inscrit(e) à « ${e.titre} », ${quand}.\n${e.format}${e.lieu ? ', ' + e.lieu : ''}\n\nÀ bientôt !` });
    }
  });

  // 5. Courriels et lettres programmés arrivés à l'heure
  await safe('envois programmés', async () => {
    for (const o of await q<Row>(`select id from outbox where statut = 'programmé' and ref is null and type <> 'notification' and coalesce(date_envoi, now()) <= now()`))
      await safe(`envoi ${o.id}`, () => sendOutbox(o.id, SYS));
    for (const c of await q<Row>(`select id from campaigns where statut = 'Programmée' and date_envoi <= now()`))
      await safe(`lettre ${c.id}`, () => sendCampaign(c.id, SYS));
  });

  await safe('sessions', () => q('delete from sessions where expires_at < now()'));
}
