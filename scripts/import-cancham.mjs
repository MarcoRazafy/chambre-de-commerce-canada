// Remplace l'annuaire par les membres de l'ancienne plateforme CanCham (export SQL de Railway).
// Usage : npm run db:import-cancham -- <fichier.sql> <dossier-images>
//   ex. : npm run db:import-cancham -- ~/Bureau/cancham-railway-2026-11-04.sql ~/Bureau/cancham-images
// Les logos et couvertures sont copiés dans public/annuaire/ (servis par l'application, adresse « /annuaire/… »).
// Les membres actuels sont supprimés avec leurs contacts, factures, rendez-vous et mises en relation.
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const [sqlFile, imgDir] = process.argv.slice(2).filter(a => !a.startsWith('--'));
if (!sqlFile || !imgDir) throw new Error('Usage : npm run db:import-cancham -- <fichier.sql> <dossier-images>');
const dump = fs.readFileSync(sqlFile, 'utf8');
const OUT = path.join(import.meta.dirname, '..', 'public', 'annuaire');

// Lecture d'un bloc « COPY … FROM stdin » (format texte de pg_dump)
const unesc = v => v === '\\N' ? null : v.replace(/\\(\\|t|n|r|b|f|v|[0-7]{1,3})/g, (_, c) =>
  ({ '\\': '\\', t: '\t', n: '\n', r: '\r', b: '\b', f: '\f', v: '\v' })[c] ?? String.fromCharCode(parseInt(c, 8)));
function table(name) {
  const m = dump.match(new RegExp(`^COPY public\\.${name} \\(([^)]*)\\) FROM stdin;\\n([\\s\\S]*?)^\\\\\\.$`, 'm'));
  if (!m) throw new Error(`Table « ${name} » absente de l'export`);
  const cols = m[1].split(', ').map(c => c.replace(/"/g, ''));
  return m[2].split('\n').filter(Boolean).map(l => Object.fromEntries(l.split('\t').map((v, i) => [cols[i], unesc(v)])));
}

const PLACEHOLDER = /^(Activité à préciser\.?|Description à compléter\.?|Secteur à préciser)$/i;
const txt = v => { const t = (v ?? '').replace(/\r\n/g, '\n').trim(); return t && !PLACEHOLDER.test(t) ? t : null; };
const STATUT = { a_jour: 'a_jour', en_retard: 'retard', en_attente: 'attente', candidature: 'demande', refusee: 'refusee' };
const FORMULE = {
  madagascar_entreprise: 'Madagascar — Entreprise', madagascar_consultant: 'Madagascar — Consultant, groupement et ONG',
  canada_diaspora: 'Canada — Diaspora & travailleur autonome', canada_entreprise: 'Canada — Entreprise canadienne', sur_mesure: 'Sur mesure — Partenaire & sponsor',
};
const CANADA = /^(canada|montr[ée]al|qu[ée]bec|ottawa|toronto|summerside|saint-hyacinthe|gatineau|laval|longueuil|brossard)$/i;
const JURIDIQUE = { 'Entreprise Individuelle (EI)': 'Entreprise individuelle' };

// Courte étiquette (offre ou besoin) : sans puce ni tabulation, 60 caractères au plus
const label = s => {
  const t = s.replace(/^[\s•·*\-–—]+/u, '').replace(/\s+/g, ' ').trim();
  return t.length <= 60 ? t : t.slice(0, 58).replace(/\s+\S*$/, '') + '…';
};
// Profil de mise en relation : des étiquettes communes aux offres et aux besoins, déduites du secteur et des textes du membre.
// Les rapprochements suggérés comparent les besoins d'un membre aux offres d'un autre : il faut le même vocabulaire des deux côtés.
const PRODUITS = ['Agribusiness', 'Artisanat', 'Textile et habillement', 'Autres produits', 'Mines et ressources naturelles', 'Pêche et aquaculture'];
const TAGS = [
  { tag: 'Site web & applications',
    offre: (m, t) => m.secteur === 'Digital' && /(site|web|application|développement|e-commerce|logiciel|wordpress|informatique)/i.test(t),
    besoin: (m, t, r) => m.secteur !== 'Digital' && (m.secteur === 'Tourisme' || /(site web|e-commerce|en ligne|digital|numérique)/i.test(r)) },
  { tag: 'Marketing digital & réseaux sociaux',
    offre: (m, t) => ['Digital', 'Communication, médias et événementiel'].includes(m.secteur) && /(community|marketing|réseaux sociaux|communication|contenu|vidéo|branding|graphi)/i.test(t),
    besoin: (m, t, r) => !['Digital', 'Communication, médias et événementiel'].includes(m.secteur) && (['Tourisme', 'Artisanat'].includes(m.secteur) || /(visibilit|promo|faire (découvrir|connaître)|marketing|image de marque)/i.test(r)) },
  { tag: 'Externalisation & assistance à distance',
    offre: (m, t) => /(externalis|outsourc|bpo|impartition|téléconseil|support client|adjoint|assistance (administrative|commerciale|technique)|cto externalis)/i.test(t),
    besoin: m => m.pays === 'CA' },
  { tag: 'Acheteurs & distributeurs au Canada',
    offre: (m, t) => m.pays === 'CA' && /(distribut|import|commerce)/i.test(t + m.secteur),
    besoin: (m, t, r) => m.pays === 'MG' && (PRODUITS.includes(m.secteur) || /(acheteur|distribut|importateur|grossiste|débouché|partenaires? commerciaux)/i.test(r)) },
  { tag: 'Transport & logistique',
    offre: (m, t) => /(logistique|fret|transit|groupage)/i.test(t),
    besoin: (m, t, r) => PRODUITS.includes(m.secteur) || /export/i.test(t + r) },
  { tag: 'Produits malgaches à l’export',
    offre: m => m.pays === 'MG' && PRODUITS.includes(m.secteur),
    besoin: (m, t) => m.pays === 'CA' && /(distribut|import|épice|vanille)/i.test(t) },
  { tag: 'Voyage, études & emploi au Canada',
    offre: (m, t) => /(immersion canada|visa|immigration|(étude|voyage)s? au canada|assistance (en )?voyage)/i.test(m.nom + ' ' + t),
    besoin: (m, t, r) => /(emploi|étudier|études au canada|voyager au canada|mobilit)/i.test(r) },
  { tag: 'Formation & montée en compétences',
    offre: (m, t) => m.secteur === 'Formation & accompagnement' && /(formation|éducation|training|sekoly|école|institut|centre)/i.test(m.nom + ' ' + t),
    besoin: (m, t, r) => /(formation|compétenc|renforcement)/i.test(r) || m.secteur === 'Tourisme' && /hôtel/i.test(t) },
  { tag: 'Conseil & accompagnement d’affaires',
    offre: (m, t) => /(conseil|consult|accompagnement des entreprises|développement commercial|gestion de projet|avocat|comptabilit|finance)/i.test(m.nom + ' ' + t) && m.secteur !== 'Tourisme',
    besoin: (m, t, r) => /(accompagnement|appuis?|implant|structurer|conseil)/i.test(r) },
  { tag: 'Agence réceptive à Madagascar',
    offre: m => m.secteur === 'Tourisme' && m.pays === 'MG' && !/yarmio/i.test(m.nom),
    besoin: (m, t, r) => /(séminaire|incentive|voyage d'affaires|mission à madagascar)/i.test(r) },
  { tag: 'Réseau d’affaires au Canada',
    offre: m => m.pays === 'CA',
    besoin: (m, t, r) => m.pays === 'MG' && /canad/i.test(r) },
];
function profile(m, produitsTxt) {
  const t = [m.activite, m.desc, produitsTxt].filter(Boolean).join(' '), r = [m.besoins, m.motivation].filter(Boolean).join(' ');
  return {
    offres: TAGS.filter(x => x.offre(m, t)).map(x => x.tag),
    besoins: TAGS.filter(x => x.besoin(m, t, r) && !x.offre(m, t)).map(x => x.tag),
  };
}
const INVOICE_OBJET = o => /^Cotisation/i.test(o) ? 'cotisation' : /^Participation/i.test(o) ? 'evenement' : 'autre';
const MOYEN = { mvola: 'MVola', orange_money: 'Orange Money', airtel_money: 'Airtel Money', virement: 'Virement', carte: 'Carte bancaire', especes: 'Espèces',
  'Espèces': 'Espèces', 'Mobile Money': 'Mobile Money', 'Virement bancaire': 'Virement', 'Chèque': 'Chèque', 'carte bancaire': 'Carte bancaire' };
const addDays = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const plusOneYear = d => { const x = new Date(d + 'T12:00:00Z'); x.setUTCFullYear(x.getUTCFullYear() + 1); return x.toISOString().slice(0, 10); };

// Copie une image référencée (« /televersements/x.jpg ») dans public/annuaire ; null si le fichier manque
let copied = 0;
const missing = [];
function image(ref) {
  if (!ref) return null;
  const name = path.basename(ref);
  const src = path.join(imgDir, name);
  if (!/^[\w.-]+$/.test(name) || !fs.existsSync(src)) { missing.push(name); return null; }
  fs.copyFileSync(src, path.join(OUT, name));
  copied++;
  return `/annuaire/${name}`;
}

const members = table('members');
const users = table('users').filter(u => u.memberId && u.role === 'membre');
const produits = table('produits');
const jetons = table('jetons_compte');
const invoices = table('invoices').filter(i => !/test/i.test(i.objet));   // les factures d'essai de paiement ne sont pas reprises
const paiements = table('paiements');
const audit = table('audit_logs');

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const q = (sql, vals) => client.query(sql, vals).then(r => r.rows);
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

try {
  await q('begin');
  const old = (await q('select id from members')).map(r => r.id);
  const factures = (await q('delete from invoices where member_id = any($1) returning id', [old])).length;
  await q('delete from members where id = any($1)', [old]);
  await q(`delete from avatars where kind = 'member'`);

  const secteurs = Object.fromEntries((await q('select id, nom from secteurs')).map(r => [r.nom, r.id]));
  const formules = Object.fromEntries((await q('select id, nom from formules')).map(r => [r.nom, r.id]));
  const statuts = {};
  let contacts = 0, suggestions = 0;
  const ids = {};   // identifiant CanCham → identifiant ici

  for (const m of members.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))) {
    const secteur = txt(m.secteur);
    if (secteur && !secteurs[secteur]) secteurs[secteur] = (await q('insert into secteurs (nom) values ($1) on conflict (nom) do update set nom = excluded.nom returning id', [secteur]))[0].id;
    const mUsers = users.filter(u => u.memberId === m.id).sort((a, b) => (b.contactPrincipal === 't') - (a.contactPrincipal === 't'));
    const acces = mUsers.some(u => u.motDePasse) ? 'actif' : jetons.some(j => mUsers.some(u => u.id === j.userId)) ? 'lien' : 'aucun';
    const ca = m.pays === 'Canada' || String(m.formule).startsWith('canada_') || CANADA.test((m.ville ?? '').trim());
    const prods = produits.filter(p => p.memberId === m.id).sort((a, b) => a.ordre - b.ordre);
    const tags = profile({ ...m, secteur: secteur ?? '', pays: ca ? 'CA' : 'MG' }, prods.map(p => `${p.label} ${p.description ?? ''}`).join(' '));
    const offres = [...new Set([...tags.offres, ...prods.map(p => label(p.label)).filter(Boolean)])].slice(0, 10);
    if (tags.besoins.length) suggestions++;
    const statut = STATUT[m.statut] ?? 'demande';
    statuts[statut] = (statuts[statut] ?? 0) + 1;
    const [row] = await q(`insert into members (nom, secteur_id, pays, ville, formule_id, statut, membre_depuis, renouvellement, acces, description,
                             besoins, interets, offres, logo_url, couverture_url, couverture_y, activite, site_web, type_membre, statut_juridique, recherche, motivation, created_at)
                           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) returning id`, [
      m.nom.replace(/\s+/g, ' ').trim(), secteurs[secteur] ?? null, ca ? 'CA' : 'MG', txt(m.ville), formules[FORMULE[m.formule]] ?? null, statut,
      m.adhesion, statut === 'demande' || statut === 'refusee' ? null : plusOneYear(m.adhesion), acces, txt(m.desc),
      tags.besoins, secteur ? [secteur] : [], offres, image(m.logo), image(m.cover), m.cover ? Number(m.coverY) : null,
      txt(m.activite), txt(m.siteweb), m.type, JURIDIQUE[m.statutJuridique] ?? txt(m.statutJuridique), txt(m.besoins), txt(m.motivation), m.createdAt,
    ]);
    ids[m.id] = row.id;
    for (const [i, u] of mUsers.entries()) {
      await q('insert into contacts (member_id, nom, fonction, email, tel, principal) values ($1, $2, $3, $4, $5, $6)',
        [row.id, u.nom.replace(/\s+/g, ' ').trim(), txt(u.fonction), u.email, txt(u.tel), i === 0]);
      contacts++;
    }
  }
  // Factures CanCham des membres repris (numéros conservés), payées à la date du règlement
  const today = new Date().toISOString().slice(0, 10);
  let nbFactures = 0;
  for (const i of invoices) {
    if (!ids[i.memberId]) continue;
    const pay = paiements.find(p => p.invoiceId === i.id && p.statut === 'reussie');
    const note = audit.find(a => a.entiteId === i.numero && /^paiement_/.test(a.action))?.detail.match(/par (.+?) pour|\((carte bancaire)\)/);
    const mode = i.statut === 'payee' ? MOYEN[pay?.mode] ?? MOYEN[note?.[1] ?? note?.[2]] ?? null : null;
    const echeance = addDays(i.date, 30);
    const statut = i.statut === 'payee' ? 'payee' : echeance < today ? 'retard' : 'envoyee';
    const histo = [{ d: `${i.date}T09:00:00+03:00`, t: 'Facture émise (reprise de la plateforme CanCham)' }];
    if (statut === 'payee') histo.push({ d: `${i.payeeLe ?? i.date}T12:00:00+03:00`, t: `Paiement enregistré${mode ? ` (${mode})` : ''}` });
    if (statut === 'retard') histo.push({ d: `${addDays(echeance, 1)}T00:05:00+03:00`, t: 'Passée en retard automatiquement à l’échéance' });
    await q(`insert into invoices (numero, member_id, objet, lignes, devise, date_emission, echeance, statut, mode_paiement, historique)
             values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [i.numero, ids[i.memberId], INVOICE_OBJET(i.objet), JSON.stringify([{ des: i.objet, mt: Number(i.montant) }]), i.devise, i.date, echeance, statut, mode, JSON.stringify(histo)]);
    nbFactures++;
  }
  // Les prochaines factures continuent la numérotation
  await q(`select setval('invoice_seq', greatest((select coalesce(max(substring(numero from '(\\d+)$')::int), 0) from invoices), 1))`);
  await q('commit');
  console.log(`✓ ${members.length} membres importés (${Object.entries(statuts).map(([k, n]) => `${n} ${k}`).join(', ')}), ${contacts} contacts, ${copied} images copiées dans public/annuaire.`);
  console.log(`  ${nbFactures} factures reprises, ${suggestions} membres avec des besoins pour les rapprochements.`);
  console.log(`  Supprimés : ${old.length} anciens membres et ${factures} factures liées.`);
  if (missing.length) console.log(`  Images introuvables (${missing.length}) : ${missing.join(', ')}`);
} catch (e) {
  await q('rollback');
  throw e;
} finally {
  await client.end();
}
