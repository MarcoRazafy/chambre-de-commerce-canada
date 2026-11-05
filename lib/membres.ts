// Gestion d'un membre, reprise de CanCham Connect : catalogue produits & services, commentaires de l'équipe,
// enregistrement d'une cotisation, refus motivé, remise à l'examen, suppression qui garde les factures, historique
import { pool, q } from './db';
import type { User } from './auth';
import { journal } from './hooks';
import { MsgError } from './messaging';

type Row = Record<string, any>;
type Upload = { nom: string; type: string; taille: number; contenu: Buffer };
export const PHOTOS_PAR_PRODUIT = 5;
const IMAGE = /^image\/(png|jpe?g|gif|webp|avif)$/;
const MAX_PHOTO = 8 * 1024 * 1024;
const clean = (v: unknown, max: number) => String(v ?? '').replace(/\r\n/g, '\n').trim().slice(0, max);

async function member(id: number) {
  const [m] = await q<Row>('select * from members where id = $1', [id]);
  if (!m) throw new MsgError('Membre introuvable');
  return m;
}

/* ===== Produits & services ===== */
export function listProduits(memberId: number) {
  return q<Row>(`select p.id, p.label, p.type, p.prix, p.description, p.ordre,
                        coalesce((select json_agg(f.id order by f.position, f.id) from produit_photos f where f.produit_id = p.id), '[]') as photos
                 from produits p where p.member_id = $1 order by p.ordre, p.id`, [memberId]);
}

// Vignettes pour l'annuaire : la première photo des 4 premières offres de chaque membre
export function vignettesProduits() {
  return q<{ member_id: number; produits: { label: string; photo: number | null }[]; total: number }>(`
    select p.member_id, count(*)::int as total,
           (json_agg(json_build_object('label', p.label, 'photo', (select f.id from produit_photos f where f.produit_id = p.id order by f.position, f.id limit 1)) order by p.ordre, p.id))
             as produits
    from produits p group by p.member_id`);
}

function produitFields(form: FormData) {
  const label = clean(form.get('label'), 160);
  if (!label) throw new MsgError('Le titre de l’offre est obligatoire');
  const type = form.get('type') === 'produit' ? 'produit' : 'service';
  return { label, type, prix: clean(form.get('prix'), 120) || null, description: clean(form.get('description'), 5000) || null };
}
function checkPhotos(files: Upload[]) {
  const bad = files.find(f => !IMAGE.test(f.type));
  if (bad) throw new MsgError(`« ${bad.nom} » n’est pas une image`);
  if (files.some(f => f.taille > MAX_PHOTO)) throw new MsgError('Une photo dépasse 8 Mo');
}

export async function createProduit(u: User, memberId: number, form: FormData, files: Upload[]) {
  const m = await member(memberId), f = produitFields(form);
  checkPhotos(files);
  const client = await pool.connect();
  try {
    await client.query('begin');
    const { rows: [p] } = await client.query(
      `insert into produits (member_id, label, type, prix, description, ordre)
       values ($1, $2, $3, $4, $5, (select coalesce(max(ordre), -1) + 1 from produits where member_id = $1)) returning id`,
      [memberId, f.label, f.type, f.prix, f.description]);
    for (const [i, x] of files.slice(0, PHOTOS_PAR_PRODUIT).entries())
      await client.query('insert into produit_photos (produit_id, nom, type, taille, contenu, position) values ($1, $2, $3, $4, $5, $6)', [p.id, x.nom, x.type, x.taille, x.contenu, i]);
    await client.query('commit');
    await journal('Adhésions', 'Offre ajoutée', `« ${f.label} » · ${m.nom}`, u.nom);
    return p.id as number;
  } catch (e) { await client.query('rollback'); throw e; } finally { client.release(); }
}

export async function updateProduit(u: User, pid: number, form: FormData, files: Upload[], retirer: number[]) {
  const [p] = await q<Row>('select p.*, m.nom as membre from produits p join members m on m.id = p.member_id where p.id = $1', [pid]);
  if (!p) throw new MsgError('Offre introuvable');
  const f = produitFields(form);
  checkPhotos(files);
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query('update produits set label = $1, type = $2, prix = $3, description = $4 where id = $5', [f.label, f.type, f.prix, f.description, pid]);
    if (retirer.length) await client.query('delete from produit_photos where produit_id = $1 and id = any($2)', [pid, retirer]);
    const { rows: [{ n, pos }] } = await client.query('select count(*)::int as n, coalesce(max(position), -1) + 1 as pos from produit_photos where produit_id = $1', [pid]);
    for (const [i, x] of files.slice(0, Math.max(0, PHOTOS_PAR_PRODUIT - n)).entries())
      await client.query('insert into produit_photos (produit_id, nom, type, taille, contenu, position) values ($1, $2, $3, $4, $5, $6)', [pid, x.nom, x.type, x.taille, x.contenu, pos + i]);
    await client.query('commit');
    await journal('Adhésions', 'Offre modifiée', `« ${f.label} » · ${p.membre}`, u.nom);
  } catch (e) { await client.query('rollback'); throw e; } finally { client.release(); }
}

export async function deleteProduit(u: User, pid: number) {
  const [p] = await q<Row>('delete from produits p using members m where p.id = $1 and m.id = p.member_id returning p.label, m.nom', [pid]);
  if (!p) throw new MsgError('Offre introuvable');
  await journal('Adhésions', 'Offre retirée', `« ${p.label} » · ${p.nom}`, u.nom);
}

export async function photoProduit(phid: number) {
  const [f] = await q<Row>('select nom, type, contenu from produit_photos where id = $1', [phid]);
  if (!f) throw new MsgError('Photo introuvable');
  return f;
}

/* ===== Commentaires de l'équipe ===== */
export const listNotes = (memberId: number) =>
  q<Row>('select id, texte, auteur, user_id, created_at from member_notes where member_id = $1 order by created_at desc, id desc', [memberId]);

export async function addNote(u: User, memberId: number, texte: string) {
  await member(memberId);
  const t = clean(texte, 2000);
  if (!t) throw new MsgError('Le commentaire est vide');
  const [n] = await q<Row>('insert into member_notes (member_id, texte, auteur, user_id) values ($1, $2, $3, $4) returning id', [memberId, t, u.nom, u.id]);
  return n.id as number;
}

export async function deleteNote(nid: number) {
  if (!(await q('delete from member_notes where id = $1 returning id', [nid])).length) throw new MsgError('Commentaire introuvable');
}

/* ===== Adhésion ===== */
const MODES = ['Espèces', 'Virement', 'MVola', 'Orange Money', 'Airtel Money', 'Carte bancaire', 'Chèque'];
const fr = (d: string) => new Date(d + 'T12:00').toLocaleDateString('fr-FR');

// Enregistrer une cotisation : la facture de cotisation ouverte est réglée (ou une facture réglée est créée),
// le membre passe « à jour », renouvellement un an après le paiement ; le premier paiement fixe la date d'adhésion
export async function registerPayment(u: User, memberId: number, b: { mode?: string; montant?: number; date?: string; note?: string }) {
  const m = await member(memberId);
  const [f] = m.formule_id ? await q<Row>('select * from formules where id = $1', [m.formule_id]) : [];
  if (!f) throw new MsgError('Choisissez d’abord la formule du membre : elle fixe le montant et la devise');
  const mode = MODES.includes(String(b.mode)) ? String(b.mode) : 'Espèces';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(b.date)) ? String(b.date) : new Date().toISOString().slice(0, 10);
  const montant = Number(b.montant) > 0 ? Number(b.montant) : Number(f.prix);
  if (!(montant > 0)) throw new MsgError('Indiquez le montant réglé (la formule est sur devis)');
  const note = clean(b.note, 300);
  const [{ n }] = await q<{ n: number }>(`select count(*)::int as n from invoices where member_id = $1 and objet = 'cotisation' and statut = 'payee'`, [memberId]);
  const premier = n === 0;
  const histo = JSON.stringify([{ d: new Date().toISOString(), t: `Paiement enregistré (${mode}) le ${fr(date)}${note ? ` · ${note}` : ''}` }]);
  const client = await pool.connect();
  let numero: string, cree = false;
  try {
    await client.query('begin');
    const { rows: [open] } = await client.query(`select id, numero from invoices where member_id = $1 and objet = 'cotisation' and statut in ('envoyee', 'retard') order by date_emission limit 1`, [memberId]);
    if (open) {
      await client.query(`update invoices set statut = 'payee', mode_paiement = $1, historique = historique || $2 where id = $3`, [mode, histo, open.id]);
      numero = open.numero;
    } else {
      const { rows: [inv] } = await client.query(
        `insert into invoices (member_id, objet, lignes, devise, date_emission, echeance, statut, mode_paiement, historique)
         values ($1, 'cotisation', $2, $3, $4, $4, 'payee', $5, $6) returning numero`,
        [memberId, JSON.stringify([{ des: `Cotisation annuelle${premier ? ' — adhésion' : ''} (${f.nom})`, mt: montant }]), f.devise, date, mode,
          JSON.stringify([{ d: new Date().toISOString(), t: 'Facture créée au règlement' }, ...JSON.parse(histo)])]);
      numero = inv.numero; cree = true;
    }
    await client.query(`update members set statut = 'a_jour', membre_depuis = case when $2 then $3::date else coalesce(membre_depuis, $3::date) end,
                        renouvellement = $3::date + interval '1 year' where id = $1`, [memberId, premier, date]);
    await client.query('commit');
  } catch (e) { await client.query('rollback'); throw e; } finally { client.release(); }
  await journal('Paiements', 'Paiement enregistré', `${numero}, ${m.nom} (${mode}, ${montant.toLocaleString('fr-FR')} ${f.devise === 'CAD' ? '$' : 'Ar'})`, u.nom);
  return `${premier ? 'Adhésion activée' : 'Paiement enregistré'} pour ${m.nom} · facture ${numero} ${cree ? 'créée et réglée' : 'réglée'}.`;
}

// Refus motivé : le commentaire est gardé dans les commentaires de l'équipe ; rien n'est envoyé au demandeur
export async function refuseWithComment(u: User, memberId: number, comment: string) {
  const m = await member(memberId);
  if (m.statut !== 'demande') throw new MsgError(m.statut === 'refusee' ? 'Cette demande est déjà refusée' : 'Cette demande a déjà été traitée');
  const t = clean(comment, 2000);
  if (!t) throw new MsgError('Expliquez le refus en quelques mots (visible de l’équipe seulement)');
  await q(`update members set statut = 'refusee' where id = $1`, [memberId]);
  await q('insert into member_notes (member_id, texte, auteur, user_id) values ($1, $2, $3, $4)', [memberId, `Refus : ${t}`, u.nom, u.id]);
  await journal('Adhésions', 'Demande d’adhésion refusée', `${m.nom} : ${t.slice(0, 160)}`, u.nom);
  return `Demande de ${m.nom} refusée.`;
}

export async function reconsider(u: User, memberId: number) {
  const m = await member(memberId);
  if (m.statut !== 'refusee') throw new MsgError('Seule une demande refusée peut être remise à l’examen');
  await q(`update members set statut = 'demande' where id = $1`, [memberId]);
  await journal('Adhésions', 'Demande remise à l’examen', m.nom, u.nom);
  return `La demande de ${m.nom} est de nouveau à examiner.`;
}

// Suppression : les factures restent, avec une copie du destinataire (nom, ville, contact principal)
export async function deleteMember(u: User, memberId: number) {
  const m = await member(memberId);
  const [c] = await q<Row>('select nom, email, tel from contacts where member_id = $1 order by principal desc, id limit 1', [memberId]);
  const client = await pool.connect();
  let n = 0;
  try {
    await client.query('begin');
    const r = await client.query(`update invoices set destinataire_nom = $2, destinataire = $3 where member_id = $1`,
      [memberId, m.nom, JSON.stringify({ nom: m.nom, ville: m.ville, pays: m.pays, statut_juridique: m.statut_juridique, contact: c ?? null })]);
    n = r.rowCount ?? 0;
    await client.query(`delete from avatars where kind in ('member', 'cover') and ref_id = $1`, [memberId]);
    await client.query('delete from members where id = $1', [memberId]);
    await client.query('commit');
  } catch (e) { await client.query('rollback'); throw e; } finally { client.release(); }
  await journal('Adhésions', 'Membre supprimé', `${m.nom}${n ? ` · ${n} facture${n > 1 ? 's' : ''} conservée${n > 1 ? 's' : ''}` : ''}`, u.nom);
  return `${m.nom} a été supprimé${n ? ` ; ses ${n} facture(s) restent dans les paiements` : ''}.`;
}

// Historique : les actions du journal qui citent le membre ou l'une de ses factures
export async function historique(memberId: number) {
  const m = await member(memberId);
  const nums = (await q<{ numero: string }>('select numero from invoices where member_id = $1', [memberId])).map(r => r.numero);
  return q<Row>(`select id, categorie, titre, detail, par, created_at from journal
                 where detail ilike '%' || $1 || '%' or detail ilike any($2::text[])
                 order by created_at desc limit 30`,
    [m.nom.replace(/[%_\\]/g, '\\$&'), nums.map(x => `%${x}%`)]);
}
