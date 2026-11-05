// Étiquettes et audiences de la newsletter.
// Chaque destinataire possible (contact d'un adhérent actif, abonné à la lettre) porte des étiquettes :
//  - automatiques, calculées depuis les fiches : type, cotisation, pays, secteur, formule, événement suivi, source d'inscription ;
//  - posées par l'équipe (tables abonne_etiquettes, membre_etiquettes).
// Une audience = inclure (une ou toutes ces étiquettes) − exclure (ces étiquettes), sans doublon d'adresse,
// et jamais une adresse désabonnée ou en échec.
import { pool, q } from './db';
import type { User } from './auth';
import { journal } from './hooks';
import { MsgError } from './messaging';

type Row = Record<string, any>;
export type Regle = { inclure: string[]; exclure: string[]; mode: 'une' | 'toutes'; contacts: 'principal' | 'tous' };
type Personne = { email: string; nom: string; entreprise: string | null; origine: 'membre' | 'abonne'; tags: Set<string> };

export const PAR_DEFAUT: Regle = { inclure: ['type:membre', 'type:abonne'], exclure: [], mode: 'une', contacts: 'principal' };
const ACTIFS = ['a_jour', 'retard', 'attente'];
const STATUTS: Record<string, string> = { a_jour: 'À jour', retard: 'En retard', attente: 'Paiement attendu' };
const PAYS: Record<string, string> = { CA: 'Canada', MG: 'Madagascar' };
const COULEUR = /^#[0-9a-f]{6}$/i;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const cle = (v: unknown) => String(v ?? '').trim().slice(0, 120);

export function lireRegle(b: Row | null | undefined): Regle {
  const liste = (v: unknown) => (Array.isArray(v) ? [...new Set(v.map(cle).filter(Boolean))].slice(0, 60) : []);
  return {
    inclure: liste(b?.inclure), exclure: liste(b?.exclure),
    mode: b?.mode === 'toutes' ? 'toutes' : 'une', contacts: b?.contacts === 'tous' ? 'tous' : 'principal',
  };
}

// Toutes les personnes joignables, avec leurs étiquettes (une seule entrée par adresse)
async function personnes(contacts: Regle['contacts']) {
  const [cts, abos, inscrits, bloques] = await Promise.all([
    q<Row>(`select c.id, c.email, c.nom, c.principal, m.id as member_id, m.nom as entreprise, m.statut, m.pays, m.secteur_id, m.formule_id,
                   coalesce((select array_agg(etiquette_id) from membre_etiquettes e where e.member_id = m.id), '{}') as etiquettes,
                   coalesce((select array_agg(distinct r.event_id) from event_registrations r where r.member_id = m.id), '{}') as evenements
            from contacts c join members m on m.id = c.member_id
            where c.email is not null and m.statut = any($1) order by m.id, c.principal desc, c.id`, [ACTIFS]),
    q<Row>(`select s.id, s.email, s.nom, s.source,
                   coalesce((select array_agg(etiquette_id) from abonne_etiquettes e where e.subscriber_id = s.id), '{}') as etiquettes
            from subscribers s where s.statut = 'Abonné'`),
    q<{ email: string; event_id: number }>(`select distinct lower(email) as email, event_id from event_registrations where email is not null`),
    q<{ email: string }>(`select lower(email) as email from subscribers where statut <> 'Abonné'`),
  ]);
  const exclues = new Set(bloques.map(b => b.email));
  const parEmail = new Map<string, Personne>();
  const ajouter = (email: string, p: Omit<Personne, 'email' | 'tags'>, tags: string[]) => {
    const e = email.trim().toLowerCase();
    if (!EMAIL.test(e) || exclues.has(e)) return;
    const deja = parEmail.get(e);
    if (deja) { tags.forEach(t => deja.tags.add(t)); if (!deja.entreprise && p.entreprise) deja.entreprise = p.entreprise; return; }
    parEmail.set(e, { email: e, ...p, tags: new Set(tags) });
  };
  const vus = new Set<number>();
  for (const c of cts) {
    // Contact principal : le contact marqué principal, sinon le premier du membre
    if (contacts === 'principal' && vus.has(c.member_id)) continue;
    vus.add(c.member_id);
    ajouter(c.email, { nom: c.nom, entreprise: c.entreprise, origine: 'membre' }, [
      'type:membre', `statut:${c.statut}`, c.pays && `pays:${c.pays}`, c.secteur_id && `secteur:${c.secteur_id}`, c.formule_id && `formule:${c.formule_id}`,
      ...c.etiquettes.map((id: number) => `etiquette:${id}`), ...c.evenements.map((id: number) => `evenement:${id}`),
    ].filter(Boolean) as string[]);
  }
  for (const s of abos) ajouter(s.email, { nom: s.nom ?? '', entreprise: null, origine: 'abonne' },
    ['type:abonne', `source:${s.source || 'Autre'}`, ...s.etiquettes.map((id: number) => `etiquette:${id}`)]);
  for (const r of inscrits) parEmail.get(r.email)?.tags.add(`evenement:${r.event_id}`);
  return { liste: [...parEmail.values()], exclues: exclues.size };
}

// Destinataires d'une règle
export async function resoudre(regle: Regle) {
  const inclure = regle.inclure.length ? regle.inclure : PAR_DEFAUT.inclure;
  const { liste } = await personnes(regle.contacts);
  const garde = liste.filter(p => (regle.mode === 'toutes' ? inclure.every(t => p.tags.has(t)) : inclure.some(t => p.tags.has(t)))
    && !regle.exclure.some(t => p.tags.has(t)));
  return garde.sort((a, b) => (a.entreprise ?? a.nom).localeCompare(b.entreprise ?? b.nom, 'fr'));
}

export async function apercu(regle: Regle) {
  // Sans étiquette incluse, personne (le « par défaut » ne vaut que pour les lettres jamais réglées)
  if (!regle.inclure.length) return { total: 0, membres: 0, abonnes: 0, liste: [] };
  const liste = await resoudre(regle);
  return {
    total: liste.length,
    membres: liste.filter(p => p.origine === 'membre').length,
    abonnes: liste.filter(p => p.origine === 'abonne').length,
    liste: liste.slice(0, 500).map(p => ({ email: p.email, nom: p.nom, entreprise: p.entreprise, origine: p.origine })),
  };
}

// Catalogue des étiquettes, par groupe, avec le nombre de personnes qui les portent
export async function catalogue() {
  const [{ liste }, etiq, secteurs, formules, events] = await Promise.all([
    personnes('principal'),
    q<Row>(`select e.id, e.nom, e.couleur,
                   (select count(*) from membre_etiquettes m where m.etiquette_id = e.id)::int as membres,
                   (select count(*) from abonne_etiquettes a where a.etiquette_id = e.id)::int as abonnes
            from etiquettes e order by lower(e.nom)`),
    q<Row>('select id, nom from secteurs order by nom'),
    q<Row>('select id, nom from formules order by nom'),
    q<Row>('select id, titre, date_debut from events order by date_debut desc limit 40'),
  ]);
  const n = new Map<string, number>();
  for (const p of liste) for (const t of p.tags) n.set(t, (n.get(t) ?? 0) + 1);
  const tag = (k: string, nom: string, extra: Row = {}) => ({ cle: k, nom, n: n.get(k) ?? 0, ...extra });
  const sources = [...new Set(liste.flatMap(p => [...p.tags].filter(t => t.startsWith('source:'))))].sort();
  const groupes = [
    { titre: 'Tout le monde', tags: [tag('type:membre', 'Tous les adhérents'), tag('type:abonne', 'Tous les abonnés à la lettre')] },
    { titre: 'Vos étiquettes', manuelles: true, tags: etiq.map(e => tag(`etiquette:${e.id}`, e.nom, { id: e.id, couleur: e.couleur })) },
    { titre: 'Cotisation', tags: ACTIFS.map(s => tag(`statut:${s}`, STATUTS[s])) },
    { titre: 'Pays', tags: Object.entries(PAYS).map(([k, v]) => tag(`pays:${k}`, v)) },
    { titre: 'Secteur', tags: secteurs.map(s => tag(`secteur:${s.id}`, s.nom)) },
    { titre: 'Formule', tags: formules.map(f => tag(`formule:${f.id}`, f.nom)) },
    { titre: 'Événements', tags: events.map(e => tag(`evenement:${e.id}`, e.titre, { date: e.date_debut })).filter(t => t.n > 0) },
    { titre: 'Inscription à la lettre', tags: sources.map(s => tag(s, `Via ${s.slice(7)}`)) },
  ];
  return { groupes, etiquettes: etiq, total: liste.length };
}

/* ===== Étiquettes posées par l'équipe ===== */
function lireEtiquette(b: Row) {
  const nom = String(b.nom ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
  if (!nom) throw new MsgError('Donnez un nom à l’étiquette');
  const couleur = COULEUR.test(String(b.couleur ?? '')) ? String(b.couleur).toLowerCase() : '#256bff';
  return { nom, couleur };
}

export async function creerEtiquette(u: User, b: Row) {
  const { nom, couleur } = lireEtiquette(b);
  const [e] = await q<Row>(`insert into etiquettes (nom, couleur) values ($1, $2) on conflict (nom) do nothing returning id, nom, couleur`, [nom, couleur]);
  if (!e) throw new MsgError(`L’étiquette « ${nom} » existe déjà`);
  await journal('Communication', 'Étiquette créée', nom, u.nom);
  return e;
}

export async function modifierEtiquette(u: User, id: number, b: Row) {
  const { nom, couleur } = lireEtiquette(b);
  try {
    const [e] = await q<Row>('update etiquettes set nom = $1, couleur = $2 where id = $3 returning id, nom, couleur', [nom, couleur, id]);
    if (!e) throw new MsgError('Étiquette introuvable');
    return e;
  } catch (err) {
    if ((err as { code?: string }).code === '23505') throw new MsgError(`L’étiquette « ${nom} » existe déjà`);
    throw err;
  }
}

export async function supprimerEtiquette(u: User, id: number) {
  const [e] = await q<{ nom: string }>('delete from etiquettes where id = $1 returning nom', [id]);
  if (!e) throw new MsgError('Étiquette introuvable');
  // Les audiences et lettres qui s'en servaient l'oublient
  await q(`update audiences set inclure = array_remove(inclure, $1), exclure = array_remove(exclure, $1)`, [`etiquette:${id}`]);
  await q(`update campaigns set inclure = array_remove(inclure, $1), exclure = array_remove(exclure, $1) where statut <> 'Envoyée'`, [`etiquette:${id}`]);
  await journal('Communication', 'Étiquette supprimée', e.nom, u.nom);
}

// Poser ou retirer une étiquette sur des abonnés ou des membres (l'étiquette peut être créée au passage par son nom)
export async function poser(u: User, b: Row) {
  const cible = b.cible === 'membre' ? 'membre' : b.cible === 'abonne' ? 'abonne' : null;
  if (!cible) throw new MsgError('Cible inconnue');
  const ids = Array.isArray(b.ids) ? [...new Set(b.ids.map(Number).filter((n: number) => Number.isInteger(n) && n > 0))] : [];
  if (!ids.length) throw new MsgError('Cochez au moins une personne');
  let etiquetteId = Number(b.etiquette_id);
  if (!Number.isInteger(etiquetteId) || etiquetteId <= 0) {
    const { nom, couleur } = lireEtiquette(b);
    const [e] = await q<{ id: number }>(`insert into etiquettes (nom, couleur) values ($1, $2) on conflict (nom) do update set nom = excluded.nom returning id`, [nom, couleur]);
    etiquetteId = e.id;
  }
  const [e] = await q<{ nom: string }>('select nom from etiquettes where id = $1', [etiquetteId]);
  if (!e) throw new MsgError('Étiquette introuvable');
  const table = cible === 'membre' ? 'membre_etiquettes' : 'abonne_etiquettes', col = cible === 'membre' ? 'member_id' : 'subscriber_id';
  const r = b.retirer
    ? await q(`delete from ${table} where etiquette_id = $1 and ${col} = any($2) returning 1`, [etiquetteId, ids])
    : await q(`insert into ${table} (${col}, etiquette_id) select x, $1 from unnest($2::int[]) x on conflict do nothing returning 1`, [etiquetteId, ids]);
  await journal('Communication', b.retirer ? 'Étiquette retirée' : 'Étiquette posée', `${e.nom} · ${r.length} ${cible === 'membre' ? 'membre' : 'abonné'}${r.length > 1 ? 's' : ''}`, u.nom);
  return { n: r.length, etiquette_id: etiquetteId, nom: e.nom };
}

// Étiquettes posées, par personne : { abonnes: { id: [etiquette_id] }, membres: { … } }
export async function etiquettesPosees() {
  const [a, m] = await Promise.all([
    q<Row>('select subscriber_id as id, array_agg(etiquette_id) as e from abonne_etiquettes group by 1'),
    q<Row>('select member_id as id, array_agg(etiquette_id) as e from membre_etiquettes group by 1'),
  ]);
  return { abonnes: Object.fromEntries(a.map(x => [x.id, x.e])), membres: Object.fromEntries(m.map(x => [x.id, x.e])) };
}

// Import CSV : une colonne « etiquettes » (séparées par , ou ;) pose ces étiquettes, créées au besoin
export async function etiqueterImport(emails: { email: string; etiquettes: string[] }[]) {
  const c = await pool.connect();
  try {
    for (const { email, etiquettes } of emails) {
      for (const nom of etiquettes) {
        const { rows: [e] } = await c.query(`insert into etiquettes (nom) values ($1) on conflict (nom) do update set nom = excluded.nom returning id`, [nom.slice(0, 40)]);
        await c.query(`insert into abonne_etiquettes (subscriber_id, etiquette_id) select id, $2 from subscribers where lower(email) = $1 on conflict do nothing`, [email, e.id]);
      }
    }
  } finally { c.release(); }
}

/* ===== Audiences enregistrées ===== */
export const listeAudiences = () => q<Row>('select * from audiences order by lower(nom)');

export async function enregistrerAudience(u: User, id: number | null, b: Row) {
  const nom = String(b.nom ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);
  if (!nom) throw new MsgError('Donnez un nom à l’audience');
  const r = lireRegle(b);
  if (!r.inclure.length) throw new MsgError('Choisissez au moins une étiquette à inclure');
  const vals = [nom, r.inclure, r.exclure, r.mode, r.contacts];
  const [a] = id
    ? await q<Row>('update audiences set nom = $1, inclure = $2, exclure = $3, mode = $4, contacts = $5, updated_at = now() where id = $6 returning *', [...vals, id])
    : await q<Row>('insert into audiences (nom, inclure, exclure, mode, contacts) values ($1, $2, $3, $4, $5) returning *', vals);
  if (!a) throw new MsgError('Audience introuvable');
  await journal('Communication', id ? 'Audience modifiée' : 'Audience enregistrée', nom, u.nom);
  return a;
}

export async function supprimerAudience(id: number) {
  const [a] = await q('delete from audiences where id = $1 returning id', [id]);
  if (!a) throw new MsgError('Audience introuvable');
}

/* ===== Destinataires d'une lettre ===== */
export async function destinatairesLettre(u: User, id: number, b: Row) {
  const r = lireRegle(b);
  if (!r.inclure.length) throw new MsgError('Choisissez au moins une étiquette à inclure');
  const [c] = await q<Row>(`update campaigns set inclure = $1, exclure = $2, mode = $3, contacts = $4 where id = $5 and statut <> 'Envoyée' returning titre`,
    [r.inclure, r.exclure, r.mode, r.contacts, id]);
  if (!c) throw new MsgError('Lettre introuvable ou déjà envoyée');
  const { total } = await apercu(r);
  await q('update campaigns set destinataires = $1 where id = $2', [total, id]);
  await journal('Communication', 'Destinataires choisis', `${c.titre} · ${total} destinataire${total > 1 ? 's' : ''}`, u.nom);
  return { total };
}
