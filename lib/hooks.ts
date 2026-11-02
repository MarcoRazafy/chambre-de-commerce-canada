import { q } from './db';
import type { Resource } from './resources';

export const journal = (categorie: string, titre: string, detail: string | null, par: string) =>
  q('insert into journal (categorie, titre, detail, par) values ($1, $2, $3, $4)', [categorie, titre, detail, par]);

export const notify = (texte: string) => q('insert into notifications (texte) values ($1)', [texte]);

const CAT: Record<string, string> = {
  members: 'Adhésions', contacts: 'Adhésions', connections: 'Adhésions', formules: 'Adhésions', secteurs: 'Adhésions',
  events: 'Événements', event_registrations: 'Événements', agenda_rappels: 'Événements', rdv_types: 'Événements', rendez_vous: 'Événements',
  news: 'Contenus', dossiers: 'Contenus', services: 'Contenus',
  campaigns: 'Communication', subscribers: 'Communication', outbox: 'Communication', threads: 'Communication',
  invoices: 'Paiements', reglements: 'Paiements', platform_invoices: 'Paiements', team_users: 'Équipe',
};
const VERB = { ajout: 'Ajout dans', modification: 'Modification dans', suppression: 'Suppression dans' };

// Appelé après chaque écriture de l'API générique : journal + notifications utiles
export async function afterWrite(r: Resource, op: keyof typeof VERB, row: Record<string, any>, par: string) {
  if (r.table === 'journal' || r.table === 'notifications') return;
  await journal(CAT[r.table] ?? 'Système', `${VERB[op]} ${r.title}`, String(row[r.label] ?? '#' + row.id), par);
  if (op === 'ajout' && r.table === 'members' && row.statut === 'demande') await notify(`Nouvelle demande d’adhésion : ${row.nom}`);
  if (op === 'ajout' && r.table === 'reglements') await notify(`Règlement annoncé : ${row.reference}${row.moyen ? ' par ' + row.moyen : ''}`);
}
