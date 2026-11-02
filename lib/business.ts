// Actions métier du back-office (boutons des tableaux et tâches automatiques)
import { q } from './db';
import { journal, notify } from './hooks';
import { appUrl, audienceEmails, deliver, sendEmail } from './mail';
import { invoiceTotals, money, type Ligne, type Row } from './format';

export class ActionError extends Error {}
const today = () => new Date().toISOString().slice(0, 10);
const histo = (t: string) => JSON.stringify([{ d: new Date().toISOString(), t }]);

export async function getSettings(cle: string): Promise<Row> {
  const [r] = await q<{ valeur: Row }>('select valeur from settings where cle = $1', [cle]);
  return r?.valeur ?? {};
}

async function one(table: string, id: number) {
  const [row] = await q(`select * from ${table} where id = $1`, [id]);
  if (!row) throw new ActionError('Introuvable');
  return row as Row;
}

export const memberEmails = async (memberId: number) =>
  (await q<{ email: string }>('select email from contacts where member_id = $1 and email is not null order by principal desc, id', [memberId])).map(r => r.email);

function invoiceText(inv: Row, member: Row, org: Row, intro: string) {
  const t = invoiceTotals(inv as { lignes: Ligne[]; devise: string }, org);
  const lines = (inv.lignes as Ligne[]).map(l => `  - ${l.des} : ${money(l.mt, inv.devise)}`).join('\n');
  return `Bonjour,

${intro}

Facture ${inv.numero} — ${member.nom}
${lines}${t.tps ? `\n  TPS : ${money(t.tps, 'CAD')}\n  TVQ : ${money(t.tvq, 'CAD')}` : ''}
Total : ${money(t.total, inv.devise)}
Échéance : ${new Date(inv.echeance + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}

${org.modalites ?? ''}

${org.court || org.nom || 'La Chambre de commerce'}${org.courriel ? ' · ' + org.courriel : ''}${org.tel ? ' · ' + org.tel : ''}`;
}

export async function createInvoice(o: { member_id: number; objet: string; lignes: Ligne[]; devise: string; echeance?: string; par: string; intro?: string }) {
  const [inv] = await q<Row>(
    `insert into invoices (member_id, objet, lignes, devise, echeance, historique) values ($1, $2, $3, $4, $5, $6) returning *`,
    [o.member_id, o.objet, JSON.stringify(o.lignes), o.devise, o.echeance ?? null, histo('Facture émise')]);
  await emailInvoice(inv, o.par, o.intro);
  return inv;
}

// Envoi de la facture au membre (aussi appelé après une création manuelle dans « Paiements & factures »)
export async function emailInvoice(inv: Row, par: string, intro = 'Veuillez trouver ci-dessous votre facture.') {
  const member = await one('members', inv.member_id), org = await getSettings('org');
  const r = await sendEmail({ to: await memberEmails(inv.member_id), subject: `Facture ${inv.numero}`, text: invoiceText(inv, member, org, intro), ref: `inv:${inv.id}:emise` });
  await q('update invoices set historique = historique || $1 where id = $2',
    [histo(r.sent ? 'Envoyée par courriel' : `Non envoyée par courriel : ${r.error ?? 'aucun contact'}`), inv.id]);
  await journal('Paiements', 'Facture émise', `${inv.numero}, ${member.nom}`, par);
}

/* ===== Adhésions ===== */
export async function approveMember(id: number, par: string) {
  const m = await one('members', id);
  if (m.statut !== 'demande') throw new ActionError('Cette demande a déjà été traitée');
  const f = m.formule_id ? (await q<Row>('select * from formules where id = $1', [m.formule_id]))[0] : null;
  await q(`update members set statut = 'attente', acces = case when acces = 'aucun' then 'lien' else acces end where id = $1`, [id]);
  let msg = 'Demande acceptée.';
  if (f && f.prix != null) {
    const inv = await createInvoice({ member_id: id, objet: 'cotisation', lignes: [{ des: `Cotisation annuelle (${f.nom})`, mt: f.prix }], devise: f.devise, par, intro: 'Votre demande d’adhésion a été acceptée. Bienvenue ! Voici la facture de votre cotisation annuelle.' });
    msg += ` Facture ${inv.numero} émise.`;
  } else msg += ' Aucune facture : la formule est sur devis ou absente.';
  await journal('Adhésions', 'Demande d’adhésion acceptée', m.nom, par);
  return msg;
}

export async function refuseMember(id: number, par: string) {
  const m = await one('members', id);
  await q(`update members set statut = 'refusee' where id = $1`, [id]);
  await journal('Adhésions', 'Demande d’adhésion refusée', m.nom, par);
  return 'Demande refusée.';
}

export async function remindMember(id: number, par: string) {
  const m = await one('members', id);
  const invs = await q<Row>(`select * from invoices where member_id = $1 and statut in ('envoyee', 'retard') order by echeance`, [id]);
  if (!invs.length) throw new ActionError('Aucune facture impayée pour ce membre');
  for (const inv of invs) await remindInvoice(inv.id, par);
  return `${invs.length} relance(s) envoyée(s) à ${m.nom}.`;
}

/* ===== Factures et règlements ===== */
export async function markPaid(id: number, mode: string | null, par: string) {
  const inv = await one('invoices', id);
  if (inv.statut === 'payee') throw new ActionError('Facture déjà payée');
  await q(`update invoices set statut = 'payee', mode_paiement = coalesce($1, mode_paiement), historique = historique || $2 where id = $3`,
    [mode || null, histo(`Paiement enregistré${mode ? ` (${mode})` : ''}`), id]);
  const m = await one('members', inv.member_id);
  if (inv.objet === 'cotisation')
    // Renouvellement : +1 an à partir de l'échéance en cours si elle est à venir, sinon à partir d'aujourd'hui
    await q(`update members set statut = 'a_jour', membre_depuis = coalesce(membre_depuis, current_date),
             renouvellement = greatest(coalesce(renouvellement, current_date), current_date) + interval '1 year' where id = $1`, [m.id]);
  const org = await getSettings('org');
  await sendEmail({ to: await memberEmails(m.id), subject: `Paiement reçu pour la facture ${inv.numero}`, ref: `inv:${id}:payee`,
    text: `Bonjour,\n\nNous avons bien reçu votre paiement de ${money(invoiceTotals(inv as never, org).total, inv.devise)} pour la facture ${inv.numero}. Merci !\n\n${org.court || org.nom || ''}` });
  await journal('Paiements', 'Paiement enregistré', `${inv.numero}, ${m.nom}${mode ? ` (${mode})` : ''}`, par);
  return `Facture ${inv.numero} marquée payée.`;
}

export async function remindInvoice(id: number, par: string, ref?: string) {
  const inv = await one('invoices', id);
  if (!['envoyee', 'retard'].includes(inv.statut)) throw new ActionError('Seules les factures impayées peuvent être relancées');
  const m = await one('members', inv.member_id), org = await getSettings('org');
  const late = inv.echeance < today();
  const r = await sendEmail({ to: await memberEmails(m.id), subject: `${late ? 'Relance' : 'Rappel'} : facture ${inv.numero}`, ref,
    text: invoiceText(inv, m, org, late ? 'Sauf erreur de notre part, la facture ci-dessous reste impayée après son échéance.' : 'Petit rappel : la facture ci-dessous arrive bientôt à échéance.') });
  if ((r as { duplicate?: boolean }).duplicate) return 'Relance déjà envoyée.';
  if (!r.sent) throw new ActionError(r.error ?? 'Envoi impossible');
  await q('update invoices set nb_relances = nb_relances + 1, historique = historique || $1 where id = $2', [histo(`${late ? 'Relance' : 'Rappel'} envoyé par courriel`), id]);
  await journal('Paiements', 'Relance envoyée', `${inv.numero}, ${m.nom}`, par);
  return `Relance envoyée à ${m.nom}.`;
}

export async function confirmReglement(id: number, par: string) {
  const g = await one('reglements', id);
  await q(`update reglements set statut = 'confirmé' where id = $1`, [id]);
  let msg = `Règlement ${g.reference} confirmé.`;
  if (g.invoice_id) {
    const [inv] = await q<Row>('select statut from invoices where id = $1', [g.invoice_id]);
    if (inv && inv.statut !== 'payee') msg += ' ' + await markPaid(g.invoice_id, g.moyen, par);
  }
  await journal('Paiements', 'Règlement confirmé', g.reference, par);
  return msg;
}

export async function rejectReglement(id: number, par: string) {
  const g = await one('reglements', id);
  await q(`update reglements set statut = 'rejeté' where id = $1`, [id]);
  await journal('Paiements', 'Règlement rejeté', g.reference, par);
  return `Règlement ${g.reference} rejeté.`;
}

/* ===== Communication ===== */
export async function sendCampaign(id: number, par: string) {
  const c = await one('campaigns', id);
  if (c.statut === 'Envoyée') throw new ActionError('Lettre déjà envoyée');
  if (!c.contenu?.trim()) throw new ActionError('La lettre n’a pas de contenu');
  const to = await audienceEmails('Adhérents + abonnés');
  if (!to.length) throw new ActionError('Aucun destinataire : ajoutez des contacts aux membres ou des abonnés');
  const jetons = new Map((await q<{ email: string; jeton: string }>(`select lower(email) email, jeton from subscribers where statut = 'Abonné'`)).map(s => [s.email, s.jeton]));
  const r = await deliver(to, c.titre, email => c.contenu + (jetons.has(email) ? `\n\n—\nSe désabonner : ${appUrl()}/desabonnement?t=${jetons.get(email)}` : ''));
  await q(`insert into outbox (type, sujet, audience, destinataires, nb, date_envoi, statut, contenu, erreur) values ('newsletter', $1, 'Adhérents + abonnés', $2, $3, now(), $4, $5, $6)`,
    [c.titre, to.join(', '), to.length, r.sent ? 'envoyé' : 'échec', c.contenu, r.error]);
  if (!r.sent) throw new ActionError(r.error ?? 'Envoi impossible');
  await q(`update campaigns set statut = 'Envoyée', date_envoi = now(), destinataires = $1 where id = $2`, [r.sent, id]);
  await journal('Communication', 'Newsletter envoyée', `${c.titre} (${r.sent} destinataire(s))`, par);
  return `Lettre envoyée à ${r.sent} destinataire(s).${r.error ? ' Erreurs : ' + r.error : ''}`;
}

export async function sendOutbox(id: number, par: string) {
  const o = await one('outbox', id);
  if (o.statut === 'envoyé') throw new ActionError('Déjà envoyé');
  const to = await audienceEmails(o.audience, o.destinataires);
  if (!to.length) {
    await q(`update outbox set statut = 'échec', erreur = 'Aucun destinataire' where id = $1`, [id]);
    throw new ActionError('Aucun destinataire');
  }
  const r = await deliver(to, o.sujet, o.contenu ?? '');
  await q(`update outbox set statut = $1, erreur = $2, nb = $3, date_envoi = coalesce(date_envoi, now()) where id = $4`, [r.sent ? 'envoyé' : 'échec', r.error, to.length, id]);
  if (!r.sent) throw new ActionError(r.error ?? 'Envoi impossible');
  await journal('Communication', 'Courriel envoyé', `${o.sujet} (${r.sent} destinataire(s))`, par);
  return `Envoyé à ${r.sent} destinataire(s).`;
}

// Mise en relation : enregistre la relation, ouvre une conversation avec chacun et prévient par courriel
export async function introduce(a: number, b: number, message: string, par: string) {
  const [x, y] = [Math.min(a, b), Math.max(a, b)];
  const ma = await one('members', x), mb = await one('members', y);
  await q(`insert into connections (member_a, member_b, statut, note) values ($1, $2, 'relation', $3)
           on conflict (member_a, member_b) do update set statut = 'relation', note = excluded.note`, [x, y, message]);
  for (const [m, other] of [[ma, mb], [mb, ma]]) {
    const [t] = await q<{ id: number }>('insert into threads (member_id, sujet) values ($1, $2) returning id', [m.id, `Mise en relation avec ${other.nom}`]);
    await q('insert into messages (thread_id, de_nous, texte) values ($1, true, $2)', [t.id, message]);
    await sendEmail({ to: await memberEmails(m.id), subject: `Mise en relation avec ${other.nom}`, text: `Bonjour,\n\n${message}` });
  }
  await journal('Adhésions', 'Mise en relation', `${ma.nom} ↔ ${mb.nom}`, par);
  return `${ma.nom} et ${mb.nom} ont été mis en relation.`;
}

export async function importSubscribers(rows: { email: string; nom?: string }[], par: string) {
  let n = 0;
  for (const r of rows.slice(0, 5000)) {
    const email = String(r.email ?? '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) continue;
    n += (await q(`insert into subscribers (email, nom, source) values ($1, $2, 'Import CSV') on conflict (email) do nothing returning id`, [email, r.nom?.trim() || null])).length;
  }
  await journal('Communication', 'Import d’abonnés', `${n} abonné(s) ajouté(s)`, par);
  return `${n} abonné(s) importé(s).`;
}

export async function readAllNotifications() {
  await q('update notifications set lu = true where not lu');
  return 'Toutes les notifications sont marquées comme lues.';
}

export { notify };
