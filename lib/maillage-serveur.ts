import { randomBytes } from 'node:crypto';
import { q } from './db';
import type { Row } from './format';
import { journal } from './hooks';
import { MsgError } from './messaging';
import { nettoyer, prerempli, progression, type Reponses } from './maillage';

const MEMBRE = 'select id, nom, site_web, secteur_id, description, activite from members where id = $1';

// Questionnaire d'un membre : ses réponses (ou celles tirées de sa fiche), la liste des secteurs, son lien
export async function charger(memberId: number) {
  const [m] = await q<Row>(MEMBRE, [memberId]);
  if (!m) throw new MsgError('Membre introuvable');
  const [mg] = await q<Row>('select reponses, jeton, rempli_par, commence_le, complete_le, maj_le from maillage where member_id = $1', [memberId]);
  const secteurs = await q<Row>('select id, nom from secteurs order by nom');
  const reponses: Reponses = mg && Object.keys(mg.reponses ?? {}).length ? mg.reponses : prerempli(m);
  return { membre: { id: m.id, nom: m.nom }, secteurs, reponses, jeton: mg?.jeton ?? null, rempli_par: mg?.rempli_par ?? null,
    complete_le: mg?.complete_le ?? null, maj_le: mg?.maj_le ?? null, ...progression(reponses) };
}

// Enregistre une partie des réponses (une question ou plusieurs) ; date la première réponse et la complétion
export async function enregistrer(memberId: number, patch: unknown, par: string) {
  const r = nettoyer(patch);
  if (!Object.keys(r).length) throw new MsgError('Aucune réponse à enregistrer');
  const [m] = await q<Row>(MEMBRE, [memberId]);
  if (!m) throw new MsgError('Membre introuvable');
  // Première fois : on part des informations de la fiche, pour ne pas les perdre
  const [mg] = await q<Row>(`insert into maillage (member_id, reponses, rempli_par, commence_le)
      values ($1, $2::jsonb || $3::jsonb, $4, now())
      on conflict (member_id) do update set reponses = (case when maillage.reponses = '{}'::jsonb then $2::jsonb else maillage.reponses end) || $3::jsonb, rempli_par = $4,
        commence_le = coalesce(maillage.commence_le, now()), maj_le = now()
      returning reponses, complete_le`, [memberId, JSON.stringify(prerempli(m)), JSON.stringify(r), par]);
  const p = progression(mg.reponses);
  if (p.pct === 100 && !mg.complete_le) {
    await q('update maillage set complete_le = now() where member_id = $1', [memberId]);
    await journal('Adhésions', 'Questionnaire de maillage complété', m.nom, par);
  }
  return p;
}

// Suivi pour l'équipe : chaque membre actif, avec sa progression
export async function suivi() {
  const rows = await q<Row>(`select m.id, m.nom, m.statut, mg.reponses, mg.jeton is not null as lien, mg.rempli_par, mg.maj_le, mg.complete_le
                             from members m left join maillage mg on mg.member_id = m.id
                             where m.statut in ('a_jour', 'attente', 'retard') order by m.nom`);
  return rows.map(({ reponses, ...r }) => ({ ...r, ...progression(reponses ?? {}), commence: !!reponses && Object.keys(reponses).length > 0 }));
}

// Lien personnel : créé à la demande, gardé tant que l'équipe ne le change pas
export async function lien(memberId: number, nouveau = false) {
  const [m] = await q<Row>('select id from members where id = $1', [memberId]);
  if (!m) throw new MsgError('Membre introuvable');
  const jeton = randomBytes(24).toString('base64url');
  const [r] = await q<Row>(`insert into maillage (member_id, jeton) values ($1, $2)
      on conflict (member_id) do update set jeton = case when $3 or maillage.jeton is null then excluded.jeton else maillage.jeton end
      returning jeton`, [memberId, jeton, nouveau]);
  return r.jeton as string;
}
export const desactiver = (memberId: number) => q('update maillage set jeton = null where member_id = $1', [memberId]);

// Membre d'un lien personnel (null si le lien n'existe pas ou a été désactivé)
export async function parJeton(jeton: string) {
  if (!/^[\w-]{20,64}$/.test(jeton)) return null;
  const [r] = await q<Row>('select member_id from maillage where jeton = $1', [jeton]);
  return r ? Number(r.member_id) : null;
}
