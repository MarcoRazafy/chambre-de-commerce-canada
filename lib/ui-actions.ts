import type { Row } from './format';

// Boutons d'action affichés sur les lignes des tableaux (→ POST /api/actions/<action>)
export type RowAction = { label: string; action: string; show: (r: Row) => boolean; confirm?: string; ask?: string };
const unpaid = (r: Row) => ['envoyee', 'retard'].includes(r.statut);

export const ROW_ACTIONS: Record<string, RowAction[]> = {
  members: [
    { label: 'Accepter', action: 'member-approve', show: r => r.statut === 'demande', confirm: 'Accepter cette demande ? La facture de cotisation sera émise et envoyée au membre.' },
    { label: 'Refuser', action: 'member-refuse', show: r => r.statut === 'demande', confirm: 'Refuser cette demande d’adhésion ?' },
    { label: 'Relancer', action: 'member-remind', show: r => ['retard', 'attente'].includes(r.statut), confirm: 'Envoyer une relance pour toutes ses factures impayées ?' },
  ],
  invoices: [
    { label: 'Payée', action: 'invoice-paid', show: unpaid, ask: 'Mode de paiement (MVola, Orange Money, Airtel Money, Virement, Espèces, Carte bancaire) :' },
    { label: 'Relancer', action: 'invoice-remind', show: unpaid, confirm: 'Envoyer une relance par courriel ?' },
  ],
  reglements: [
    { label: 'Confirmer', action: 'reglement-confirm', show: r => r.statut === 'annoncé', confirm: 'Confirmer ce règlement ? La facture liée sera marquée payée.' },
    { label: 'Rejeter', action: 'reglement-reject', show: r => r.statut === 'annoncé', confirm: 'Rejeter ce règlement ?' },
  ],
  campaigns: [
    { label: 'Envoyer maintenant', action: 'campaign-send', show: r => r.statut !== 'Envoyée', confirm: 'Envoyer cette lettre maintenant à tous les adhérents et abonnés ?' },
  ],
  outbox: [
    { label: 'Envoyer', action: 'outbox-send', show: r => ['programmé', 'échec'].includes(r.statut) && r.type !== 'notification' && !r.ref, confirm: 'Envoyer maintenant ?' },
    { label: 'Annuler', action: 'outbox-cancel', show: r => r.statut === 'programmé' },
  ],
};

// Pages retirées du menu (comme dans la maquette), accessibles par un bouton sur la page parente
export const RELATED: Record<string, [href: string, label: string][]> = {
  members: [['/contacts', 'Contacts'], ['/formules', 'Formules'], ['/secteurs', 'Secteurs']],
  events: [['/inscriptions', 'Inscriptions']],
  rendez_vous: [['/types-rendez-vous', 'Types de rendez-vous']],
  campaigns: [['/envois', 'Envois programmés']],
};

// Tables dont la première colonne ouvre une fiche : /<slug>/<id>
export const DETAIL: Record<string, string> = { members: 'membres', events: 'evenements', invoices: 'paiements' };

export async function runAction(action: string, body: Record<string, unknown>) {
  const res = await fetch('/api/actions/' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (res.status === 401) window.location.href = '/connexion';
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || `Erreur ${res.status}`);
  window.dispatchEvent(new Event('cc:refresh'));   // met à jour les compteurs du menu
  return d.message as string;
}

// CSV compatible Excel (séparateur « ; », encodage UTF-8 avec BOM)
export function downloadCsv(name: string, header: string[], rows: string[][]) {
  const cell = (v: string) => /[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const csv = '﻿' + [header, ...rows].map(r => r.map(cell).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = name + '.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

// Lecture d'un CSV d'abonnés : colonnes « email » et « nom » si présentes, sinon 1re colonne = courriel
export function parseCsv(text: string) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];
  const sep = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  const split = (l: string) => l.split(sep).map(c => c.trim().replace(/^"|"$/g, ''));
  const head = split(lines[0]).map(h => h.toLowerCase());
  const ie = head.findIndex(h => /e-?mail|courriel/.test(h)), inom = head.findIndex(h => /nom|name/.test(h));
  const itag = head.findIndex(h => /[ée]tiquette|tags?$/.test(h));   // facultative : « Presse | VIP »
  const body = ie >= 0 ? lines.slice(1) : lines;
  return body.map(split).map(c => ({ email: c[ie >= 0 ? ie : 0], nom: inom >= 0 ? c[inom] : undefined, etiquettes: itag >= 0 ? c[itag] : undefined }));
}
