import nodemailer, { type Transporter } from 'nodemailer';
import { q } from './db';

// Configuration SMTP par variables d'environnement (voir .env.example).
// Sans SMTP_HOST, rien n'est envoyé : l'envoi est noté « échec » dans la file d'envoi.
let transporter: Transporter | null = null;
const transport = () => (transporter ??= nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
}));

export const appUrl = () => (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

export const cleanEmails = (list: (string | null | undefined)[]) =>
  [...new Set(list.flatMap(s => String(s ?? '').split(/[\s,;]+/)).map(s => s.trim().toLowerCase()).filter(s => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)))];

type Text = string | ((email: string) => string);

// Un courriel par destinataire (pas d'adresses visibles entre membres)
export async function deliver(to: string[], subject: string, text: Text) {
  if (!process.env.SMTP_HOST) return { sent: 0, error: 'Envoi de courriels non configuré (SMTP_HOST manquant)' };
  let sent = 0;
  const errors: string[] = [];
  for (const email of to) {
    try {
      await transport().sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to: email, subject, text: typeof text === 'function' ? text(email) : text });
      sent++;
    } catch (e) {
      errors.push(`${email} : ${(e as Error).message}`);
    }
  }
  return { sent, error: errors.length ? errors.slice(0, 5).join(' · ') : null };
}

// Envoie tout de suite et garde une trace dans la file d'envoi.
// ref (facultatif) rend l'envoi unique : une deuxième tentative avec la même ref est ignorée.
export async function sendEmail(o: { to: (string | null)[]; subject: string; text: Text; type?: 'courriel' | 'newsletter'; ref?: string; audience?: string }) {
  const to = cleanEmails(o.to);
  if (!to.length) return { sent: 0, error: 'Aucune adresse de courriel' };
  const [row] = await q<{ id: number }>(
    `insert into outbox (type, sujet, audience, destinataires, nb, date_envoi, statut, contenu, ref)
     values ($1, $2, $3, $4, $5, now(), 'programmé', $6, $7) on conflict (ref) do nothing returning id`,
    [o.type ?? 'courriel', o.subject, o.audience ?? null, to.join(', '), to.length, typeof o.text === 'function' ? o.text('') : o.text, o.ref ?? null]);
  if (!row) return { sent: 0, error: null, duplicate: true };
  const r = await deliver(to, o.subject, o.text);
  await q('update outbox set statut = $1, erreur = $2 where id = $3', [r.sent ? 'envoyé' : 'échec', r.error, row.id]);
  return r;
}

// Groupes de destinataires proposés dans « Envois programmés »
export const AUDIENCES = ['Adhérents', 'Membres à jour', 'Abonnés à la lettre', 'Adhérents + abonnés', 'Adresses libres'];

export async function audienceEmails(audience: string | null, extra?: string | null) {
  const contacts = (statuts: string[]) => q<{ email: string }>(
    `select c.email from contacts c join members m on m.id = c.member_id where c.email is not null and m.statut = any($1)`, [statuts]);
  const abonnes = () => q<{ email: string }>(`select email from subscribers where statut = 'Abonné'`);
  let rows: { email: string }[] = [];
  if (audience === 'Adhérents') rows = await contacts(['a_jour', 'retard', 'attente']);
  else if (audience === 'Membres à jour') rows = await contacts(['a_jour']);
  else if (audience === 'Abonnés à la lettre') rows = await abonnes();
  else if (audience === 'Adhérents + abonnés') rows = [...await contacts(['a_jour', 'retard', 'attente']), ...await abonnes()];
  return cleanEmails([...rows.map(r => r.email), extra]);
}
