import { q } from './db';
import type { Row } from './format';
import { MsgError } from './messaging';
import type { Membre } from './espace';

// Données de l'espace membre. Chaque fonction ne renvoie que ce que l'entreprise du membre connecté a le droit de voir.
const ACTIFS = `('a_jour', 'attente', 'retard')`;

/* ===== Annuaire et mises en relation ===== */
export const annuaire = () => q<Row>(`
  select m.id, m.nom, m.pays, m.ville, m.activite, m.description, m.site_web, m.offres, m.besoins, s.nom as secteur
  from members m left join secteurs s on s.id = m.secteur_id where m.statut in ${ACTIFS} order by m.nom`);

export const relations = (m: Membre) => q<Row>(`
  select c.id, c.created_at, c.note, o.id as membre_id, o.nom, o.ville, o.pays, o.activite, o.description, o.site_web, s.nom as secteur,
         (select json_build_object('nom', ct.nom, 'fonction', ct.fonction, 'email', ct.email, 'tel', ct.tel)
            from contacts ct where ct.member_id = o.id order by ct.principal desc, ct.id limit 1) as contact
  from connections c join members o on o.id = case when c.member_a = $1 then c.member_b else c.member_a end
  left join secteurs s on s.id = o.secteur_id
  where (c.member_a = $1 or c.member_b = $1) and c.statut = 'relation' order by c.created_at desc`, [m.member_id]);

/* ===== Événements ===== */
export const evenements = (m: Membre) => q<Row>(`
  select e.id, e.titre, e.date_debut, e.date_fin, e.format, e.lieu, e.capacite, e.tarif_membre, e.description, e.couverture_url,
         case when exists (select 1 from event_registrations r where r.event_id = e.id and r.member_id = $1 and lower(r.email) = lower($2))
              then e.lien_visio end as lien_visio,
         (select count(*) from event_registrations r where r.event_id = e.id)::int as inscrits,
         exists (select 1 from event_registrations r where r.event_id = e.id and r.member_id = $1 and lower(r.email) = lower($2)) as inscrit
  from events e where coalesce(e.date_fin, e.date_debut) >= now() - interval '1 day' order by e.date_debut`, [m.member_id, m.email]);

export async function inscrire(m: Membre, eventId: number) {
  const [e] = await q<Row>(`select id, titre, capacite, (select count(*) from event_registrations r where r.event_id = e.id)::int as n
                            from events e where id = $1 and coalesce(date_fin, date_debut) >= now()`, [eventId]);
  if (!e) throw new MsgError('Cet événement n’est plus ouvert aux inscriptions');
  const [deja] = await q('select 1 from event_registrations where event_id = $1 and member_id = $2 and lower(email) = lower($3)', [eventId, m.member_id, m.email]);
  if (deja) return e;
  if (e.capacite && e.n >= e.capacite) throw new MsgError('Complet : il n’y a plus de place');
  await q('insert into event_registrations (event_id, member_id, nom, email) values ($1, $2, $3, $4)', [eventId, m.member_id, m.nom, m.email]);
  await q('insert into notifications (texte, lien) values ($1, $2)', [`${m.nom} (${m.entreprise}) s’est inscrit à « ${e.titre} »`, `/evenements/${eventId}`]);
  return e;
}
export const desinscrire = (m: Membre, eventId: number) =>
  q('delete from event_registrations where event_id = $1 and member_id = $2 and lower(email) = lower($3)', [eventId, m.member_id, m.email]);

/* ===== Actualités ===== */
export const actualites = () => q<Row>(`
  select n.id, n.titre, n.categorie, n.date_pub, n.contenu,
         (select coalesce(json_agg(json_build_object('id', x.id, 'type', x.type) order by x.position, x.id), '[]') from news_media x where x.news_id = n.id) as medias
  from news n where n.publie order by n.date_pub desc, n.id desc limit 60`);
export async function mediaActualite(mid: number) {
  const [f] = await q<{ nom: string; type: string; contenu: Buffer }>(
    'select x.nom, x.type, x.contenu from news_media x join news n on n.id = x.news_id where x.id = $1 and n.publie', [mid]);
  return f ?? null;
}

/* ===== Factures ===== */
export const factures = (m: Membre) => q<Row>(`
  select i.id, i.numero, i.objet, i.lignes, i.devise, i.date_emission, i.echeance, i.statut, i.mode_paiement,
         (select json_build_object('reference', r.reference, 'moyen', r.moyen, 'statut', r.statut, 'annonce_le', r.annonce_le)
            from reglements r where r.invoice_id = i.id order by r.annonce_le desc limit 1) as reglement
  from invoices i where i.member_id = $1 and i.statut <> 'annulee' order by i.date_emission desc, i.id desc`, [m.member_id]);

export async function facture(m: Membre, id: number) {
  const [inv] = await q<Row>('select * from invoices where id = $1 and member_id = $2', [id, m.member_id]);
  if (!inv) throw new MsgError('Facture introuvable');
  const [org] = await q<{ valeur: Row }>(`select valeur from settings where cle = 'org'`);
  const [membre] = await q<Row>('select nom, ville from members where id = $1', [m.member_id]);
  const { historique: _, nb_relances: __, ...f } = inv;
  return { facture: f, org: org?.valeur ?? {}, membre, contact: { nom: m.nom, fonction: m.fonction, email: m.email } };
}

export async function annoncer(m: Membre, id: number, b: { moyen?: string; reference?: string }) {
  const [inv] = await q<Row>(`select id, numero from invoices where id = $1 and member_id = $2 and statut in ('envoyee', 'retard')`, [id, m.member_id]);
  if (!inv) throw new MsgError('Cette facture n’attend pas de règlement');
  const reference = String(b.reference ?? '').trim().slice(0, 120), moyen = String(b.moyen ?? '').trim().slice(0, 60);
  if (!reference) throw new MsgError('Indiquez la référence du paiement (numéro de transaction, de virement…)');
  await q(`insert into reglements (reference, invoice_id, moyen) values ($1, $2, $3)`, [reference, id, moyen || null]);
  await q('insert into notifications (texte, lien) values ($1, $2)', [`Règlement annoncé par ${m.entreprise} : facture ${inv.numero}${moyen ? ` (${moyen})` : ''}`, '/paiements?onglet=reglements']);
}

/* ===== Ressources ===== */
// Un dossier est ouvert si aucun de ses dossiers parents (lui compris) n'est réservé, ou si l'entreprise y a accès.
// Une ressource payante demande en plus un accès donné par la Chambre.
async function droits(memberId: number) {
  const [dossiers, accesD, accesR] = await Promise.all([
    q<Row>('select id, parent_id, nom, restreint from res_dossiers'),
    q<{ dossier_id: number }>('select dossier_id from res_acces_dossiers where member_id = $1', [memberId]),
    q<{ ressource_id: number }>('select ressource_id from res_acces_ressources where member_id = $1', [memberId]),
  ]);
  const par = new Map(dossiers.map(d => [d.id as number, d])), ouverts = new Set(accesD.map(a => a.dossier_id));
  const ouvert = (id: number | null): boolean => {
    for (let d = id != null ? par.get(id) : undefined, n = 0; d && n < 10; d = d.parent_id != null ? par.get(d.parent_id) : undefined, n++)
      if (d.restreint && !ouverts.has(d.id)) return false;
    return true;
  };
  return { dossiers, ouvert, achetees: new Set(accesR.map(a => a.ressource_id)) };
}

export async function ressources(m: Membre) {
  const { dossiers, ouvert, achetees } = await droits(m.member_id);
  const rs = await q<Row>(`select r.id, r.dossier_id, r.titre, r.cat, r.fmt, r.taille, r.description, r.type, r.prix, r.date,
             coalesce(r.cover, case when r.fmt = 'image' then r.fichier end) as vignette
      from res_ressources r order by r.ordre, r.id`);
  return {
    dossiers: dossiers.filter(d => ouvert(d.id)).map(d => ({ id: d.id, parent_id: d.parent_id, nom: d.nom })),
    ressources: rs.filter(r => ouvert(r.dossier_id)).map(r => ({ ...r, ouverte: r.type !== 'payant' || achetees.has(r.id) })),
  };
}

export async function ressource(m: Membre, id: number) {
  const { ouvert, achetees } = await droits(m.member_id);
  const [r] = await q<Row>(`select r.id, r.dossier_id, r.titre, r.cat, r.fmt, r.taille, r.description, r.type, r.prix, r.date, r.contenu, r.fichier,
             f.nom as fichier_nom, f.type as fichier_type from res_ressources r left join res_medias f on f.id = r.fichier where r.id = $1`, [id]);
  if (!r || !ouvert(r.dossier_id)) throw new MsgError('Ressource introuvable');
  if (r.type === 'payant' && !achetees.has(r.id)) return { ...r, contenu: null, fichier: null, ouverte: false };
  return { ...r, ouverte: true };
}

// Fichier d'une ressource ouverte à l'entreprise (fichier principal, couverture, ou média d'une page)
export async function mediaRessource(m: Membre, mid: number) {
  const { ouvert, achetees } = await droits(m.member_id);
  const rs = await q<Row>(`select r.id, r.dossier_id, r.type, r.cover = $1 as couverture from res_ressources r
      where r.fichier = $1 or r.cover = $1
         or exists (select 1 from jsonb_array_elements(coalesce(r.contenu, '[]')) e where e->>'media' = $1::text)`, [mid]);
  if (!rs.some(r => ouvert(r.dossier_id) && (r.couverture || r.type !== 'payant' || achetees.has(r.id)))) return null;
  const [f] = await q<{ nom: string; type: string; contenu: Buffer }>('select nom, type, contenu from res_medias where id = $1', [mid]);
  return f ?? null;
}

/* ===== Messagerie ===== */
const VISIBLE = `(t.member_id = $1 or exists (select 1 from thread_participants p where p.thread_id = t.id and p.member_id = $1))`;

export async function conversations(m: Membre) {
  return q<Row>(`
    select t.id, t.type, t.sujet, l.texte as dernier, l.created_at as dernier_at, l.de_nous as dernier_de_nous,
           (l.id is not null and l.de_nous and l.created_at > coalesce(ml.last_read_at, '-infinity')) as non_lu,
           coalesce(l.created_at, t.created_at) as maj
    from threads t
    left join membre_lectures ml on ml.thread_id = t.id and ml.contact_id = $2
    left join lateral (select * from messages where thread_id = t.id and deleted_at is null order by created_at desc limit 1) l on true
    where ${VISIBLE} and t.type <> 'equipe' order by maj desc`, [m.member_id, m.contact_id]);
}

export async function nonLus(m: Membre) {
  const [r] = await q<{ n: number }>(`select count(*)::int as n from threads t left join membre_lectures ml on ml.thread_id = t.id and ml.contact_id = $2
    where ${VISIBLE} and t.type <> 'equipe' and exists (select 1 from messages l where l.thread_id = t.id and l.de_nous and l.deleted_at is null
      and l.created_at > coalesce(ml.last_read_at, '-infinity'))`, [m.member_id, m.contact_id]);
  return r.n;
}

async function acces(m: Membre, id: number) {
  const [t] = await q<Row>(`select t.* from threads t where t.id = $2 and ${VISIBLE} and t.type <> 'equipe'`, [m.member_id, id]);
  if (!t) throw new MsgError('Conversation introuvable');
  return t;
}

export async function conversation(m: Membre, id: number) {
  const t = await acces(m, id);
  const messages = await q<Row>(`
    select ms.id, ms.texte, ms.created_at, ms.de_nous, ms.deleted_at is not null as supprime,
           (not ms.de_nous and ms.author_member_id = $2) as moi,
           case when ms.de_nous then coalesce(au.nom, 'La Chambre') else coalesce(am.nom, 'Membre') end as auteur,
           (select coalesce(json_agg(json_build_object('id', f.id, 'nom', f.nom, 'type', f.type, 'taille', f.taille) order by f.id), '[]')
              from message_files f where f.message_id = ms.id) as fichiers
    from messages ms left join team_users au on au.id = ms.author_user_id left join members am on am.id = ms.author_member_id
    where ms.thread_id = $1 order by ms.created_at`, [id, m.member_id]);
  await q(`insert into membre_lectures (thread_id, contact_id) values ($1, $2)
           on conflict (thread_id, contact_id) do update set last_read_at = now()`, [id, m.contact_id]);
  // Messages de l'entreprise : « Prénom Nom : texte » → l'auteur à part, le texte seul
  const lus = messages.map(x => {
    if (x.supprime) return { ...x, texte: '', fichiers: [] };
    const p = !x.de_nous && /^([^\n:]{2,80}) : ([\s\S]*)$/.exec(x.texte);
    return p ? { ...x, auteur: p[1], texte: p[2] } : x;
  });
  return { id: t.id, type: t.type, sujet: t.sujet, messages: lus };
}

export async function ecrire(m: Membre, id: number, texte: string) {
  await acces(m, id);
  texte = texte.trim().slice(0, 8000);
  if (!texte) throw new MsgError('Message vide');
  // « Prénom Nom : » devant le texte, pour que l'équipe sache quel contact de l'entreprise écrit
  const [msg] = await q<Row>(`insert into messages (thread_id, de_nous, author_member_id, texte) values ($1, false, $2, $3) returning id`,
    [id, m.member_id, `${m.nom} : ${texte}`]);
  await q(`insert into membre_lectures (thread_id, contact_id) values ($1, $2)
           on conflict (thread_id, contact_id) do update set last_read_at = now()`, [id, m.contact_id]);
  await q('insert into notifications (texte, lien) values ($1, $2)', [`Nouveau message de ${m.nom} (${m.entreprise})`, `/messagerie?c=${id}`]);
  return msg;
}

// « Écrire à la Chambre » : la conversation de l'entreprise avec la Chambre (créée si besoin)
export async function ecrireChambre(m: Membre, texte: string) {
  let [t] = await q<Row>(`select id from threads where type = 'membre' and member_id = $1 order by id limit 1`, [m.member_id]);
  if (!t) [t] = await q<Row>(`insert into threads (type, member_id, sujet) values ('membre', $1, '') returning id`, [m.member_id]);
  await ecrire(m, t.id, texte);
  return t.id as number;
}

export async function fichierMessage(m: Membre, fid: number) {
  const [f] = await q<{ nom: string; type: string; contenu: Buffer; thread_id: number }>(
    'select f.nom, f.type, f.contenu, ms.thread_id from message_files f join messages ms on ms.id = f.message_id where f.id = $1 and ms.deleted_at is null', [fid]);
  if (!f) return null;
  await acces(m, f.thread_id);
  return f;
}
