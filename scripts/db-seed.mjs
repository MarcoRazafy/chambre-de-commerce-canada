// Données de test (fictives, reprises de la maquette CanCham Connect v2, devenue L’Alliée Virtuelle).
// Usage : npm run db:seed            → remplit une base vide
//         npm run db:seed -- --reset → vide d'abord les données (garde les comptes qui ont un mot de passe)
// Toutes les adresses se terminent par « .test » (domaine réservé) : aucun courriel ne peut atteindre une vraie personne.
import pg from 'pg';

const RESET = process.argv.includes('--reset');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

const SECTEURS = ['Agribusiness', 'Artisanat', 'Digital', 'Formation & accompagnement', 'Tourisme', 'Mines et ressources naturelles', 'Energie', 'Mobilité internationale et immigration', 'Pêche et aquaculture', 'Textile et habillement', 'BTP, immobilier et infrastructures', 'Commerce, import-export et distribution', 'Transport', 'Services financiers', 'Communication, médias et événementiel', 'Santé', 'Autres produits', 'Autres services'];

const FORMULES = {
  'mg-ent': ['Madagascar — Entreprise', 500000, 'MGA'],
  'mg-ong': ['Madagascar — Consultant, groupement et ONG', 250000, 'MGA'],
  'ca-dia': ['Canada — Diaspora & travailleur autonome', 150, 'CAD'],
  'ca-ent': ['Canada — Entreprise canadienne', 300, 'CAD'],
  'sm': ['Sur mesure — Partenaire & sponsor', null, 'MGA'],
};

// [clé, nom, secteur, pays, ville, formule, statut, depuis, renouvellement, accès, [contact, fonction, courriel, tél], description, besoins, intérêts, offres, auto, prélèvement, moyen]
const MEMBERS = [
  ['m1', 'Vanilla Coast SARL', 'Agribusiness', 'MG', 'Sambava', 'mg-ent', 'a_jour', '2026-01-14', '2026-11-20', 'actif', ['Haingo Rasoamanana', 'Gérante', 'contact@vanillacoast.test', '+261 34 11 111 11'], 'Production et export de vanille bourbon et d’épices.', ['Distributeurs au Canada', 'Certification bio'], ['Export', 'Agroalimentaire'], ['Vanille bourbon', 'Épices'], true, true, 'Carte bancaire •••• 4417'],
  ['m2', 'Maple Gourmet Distribution', 'Commerce, import-export et distribution', 'CA', 'Montréal', 'ca-ent', 'a_jour', '2026-10-21', '2027-10-21', 'actif', ['Julie Tremblay', 'Acheteuse principale', 'jtremblay@maplegourmet.test', '+1 514 555 0101'], 'Distribution d’épicerie fine au Québec.', ['Vanille bourbon', 'Épices', 'Cacao fin'], ['Agroalimentaire', 'Commerce équitable'], ['Distributeurs au Canada'], true, true, 'Carte bancaire •••• 0391'],
  ['m3', 'Lakana Digital', 'Digital', 'MG', 'Antananarivo', 'mg-ent', 'a_jour', '2026-04-02', '2027-04-02', 'actif', ['Andry Rakoto', 'Fondateur', 'andry@lakana.test', '+261 33 22 222 22'], 'Développement web et externalisation de services numériques.', ['Clients au Canada', 'Financement'], ['Digital', 'Formation'], ['Développement logiciel', 'Centre de contacts'], false, false, null],
  ['m4', 'Laurentides Capital', 'Services financiers', 'CA', 'Québec', 'ca-ent', 'attente', null, null, 'lien', ['Marc-André Gagnon', 'Associé', 'ma@laurentidescap.test', '+1 418 555 0144'], 'Investissement d’impact en Afrique de l’Est et dans l’océan Indien.', ['Projets à fort impact', 'Startups'], ['Financement', 'Energie'], ['Financement'], false, false, null],
  ['m5', 'Rafia Lova Création', 'Artisanat', 'MG', 'Antsirabe', 'mg-ong', 'retard', '2025-10-02', '2026-10-02', 'actif', ['Fanja Ravelo', 'Présidente', 'rafialova@exemple.test', '+261 34 33 333 33'], 'Groupement d’artisanes : sacs et chapeaux en raphia crocheté main.', ['Distributeurs au Canada', 'Salons professionnels'], ['Export', 'Commerce équitable'], ['Artisanat raphia'], false, false, null],
  ['m6', 'SoaEnergy', 'Energie', 'MG', 'Toamasina', 'mg-ent', 'a_jour', '2026-02-10', '2026-12-02', 'actif', ['Rivo Andrianina', 'PDG', 'rivo@soaenergy.test', '+261 32 44 444 44'], 'Installation de centrales solaires pour sites isolés.', ['Financement', 'Équipementiers solaires'], ['Energie', 'Mines'], ['Installations solaires', 'Projets à fort impact', 'Partenaires en Afrique'], true, true, 'Carte bancaire •••• 1180'],
  ['m7', 'Nordik Solaire inc.', 'Energie', 'CA', 'Sherbrooke', 'ca-ent', 'a_jour', '2026-03-22', '2027-03-22', 'actif', ['Kevin Bouchard', 'Directeur export', 'kbouchard@nordiksolaire.test', '+1 819 555 0190'], 'Fabricant d’onduleurs et de batteries.', ['Partenaires en Afrique'], ['Energie', 'Export'], ['Équipementiers solaires'], true, true, 'Carte bancaire •••• 2290'],
  ['m8', 'Toamasina Fret Services', 'Transport', 'MG', 'Toamasina', 'mg-ent', 'attente', null, null, 'lien', ['Nirina Razafy', 'Directrice des opérations', 'nirina@tfs.test', '+261 34 55 555 55'], 'Transit, dédouanement et fret maritime.', ['Clients au Canada'], ['Logistique', 'Export'], ['Fret maritime', 'Dédouanement'], false, false, null],
  ['m9', 'Nosy Lodge & Tours', 'Tourisme', 'MG', 'Nosy Be', 'mg-ent', 'a_jour', '2026-09-01', '2027-09-01', 'actif', ['Tiana Rabe', 'Propriétaire', 'tiana@nosylodge.test', '+261 32 66 666 66'], 'Hébergement et circuits sur mesure.', ['Agences de voyage au Canada'], ['Tourisme', 'Digital'], ['Séjours d’affaires', 'Circuits sur mesure'], true, true, 'Carte bancaire •••• 6672'],
  ['m10', 'Voyages Boréal', 'Tourisme', 'CA', 'Gatineau', 'ca-ent', 'retard', '2025-10-15', '2026-10-15', 'actif', ['Philippe Morin', 'Président', 'pmorin@voyagesboreal.test', '+1 819 555 0122'], 'Agence de voyages spécialisée Afrique et océan Indien.', ['Circuits sur mesure', 'Partenaires en Afrique'], ['Tourisme', 'Export'], ['Agences de voyage au Canada'], false, false, null],
  ['m11', 'Akanga Textile SARLU', 'Textile et habillement', 'MG', 'Antananarivo', 'mg-ent', 'a_jour', '2026-08-11', '2027-08-11', 'actif', ['Mialy Andria', 'Directrice', 'mialy@akanga.test', '+261 34 77 777 77'], 'Confection de vêtements 100 % coton : t-shirts et polos.', ['Distributeurs au Canada', 'Certification bio'], ['Textile', 'Export'], ['Confection textile'], false, false, null],
  ['m12', 'BioCert Québec', 'Autres services', 'CA', 'Laval', 'ca-dia', 'a_jour', '2026-05-09', '2027-05-09', 'actif', ['Isabelle Côté', 'Consultante', 'icote@biocertqc.test', '+1 450 555 0177'], 'Accompagnement à la certification biologique et équitable.', ['Clients à Madagascar'], ['Agroalimentaire', 'Commerce équitable'], ['Certification bio'], true, false, 'Carte bancaire •••• 9034'],
  ['m13', 'Kintana Conseil', 'Formation & accompagnement', 'MG', 'Antananarivo', 'mg-ong', 'demande', null, null, 'aucun', ['Voahangy Rakotoarison', 'Consultante', 'voahangy@kintana.test', '+261 34 88 888 88'], 'Formation en gestion et mobilité professionnelle.', ['Partenaires de formation au Canada'], ['Formation'], ['Formation en gestion'], false, false, null],
  ['m14', 'Cacao Sambirano Coop', 'Agribusiness', 'MG', 'Ambanja', 'mg-ent', 'demande', null, null, 'aucun', ['Lova Ramanantsoa', 'Coordinateur', 'lova@cacaosambirano.test', '+261 32 99 999 99'], 'Coopérative de cacao fin aromatique.', ['Distributeurs au Canada'], ['Agroalimentaire', 'Export'], ['Cacao fin'], false, false, null],
];

// Logo et couverture de l'annuaire : photos libres (Wikimedia Commons et Flickr, licences CC ou domaine public), par nom de membre
const IMAGES = {
  'Vanilla Coast SARL': ['https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Bourbon_vanilla_beans_-_extra_noire_-_%2B20cm.JPG/330px-Bourbon_vanilla_beans_-_extra_noire_-_%2B20cm.JPG',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Sambava_-_grading_vanilla_beans.jpg/1280px-Sambava_-_grading_vanilla_beans.jpg'],
  'Maple Gourmet Distribution': ['https://live.staticflickr.com/5336/9199466646_0a51e2a627_n.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/MapleSyrupProduction.jpg/1280px-MapleSyrupProduction.jpg'],
  'Lakana Digital': ['https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Boutres_et_pirogue_Vezo%2C_port_de_Tul%C3%A9ar%2C_Madagascar_%2826057141635%29.jpg/330px-Boutres_et_pirogue_Vezo%2C_port_de_Tul%C3%A9ar%2C_Madagascar_%2826057141635%29.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Antananarivo_Madagascar_andohalo_plaza.JPG/1280px-Antananarivo_Madagascar_andohalo_plaza.JPG'],
  'Laurentides Capital': ['https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/20181016_-_27_-_Mont-Tremblant_National_Park_-_%22Gone_Glimmering%22.jpg/330px-20181016_-_27_-_Mont-Tremblant_National_Park_-_%22Gone_Glimmering%22.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Chateau_Frontenac_vu_depuis_L%C3%A9vis.jpg/1280px-Chateau_Frontenac_vu_depuis_L%C3%A9vis.jpg'],
  'Rafia Lova Création': ['https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Endilo_basket.jpg/330px-Endilo_basket.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Roadside_souvenir_shop_on_N7_III.jpg/1280px-Roadside_souvenir_shop_on_N7_III.jpg'],
  'SoaEnergy': ['https://live.staticflickr.com/65535/49067328751_597169b335_n.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Innovation_Africa_-_solar_panels.jpg/1280px-Innovation_Africa_-_solar_panels.jpg'],
  'Nordik Solaire inc.': ['https://live.staticflickr.com/44/137174263_8a667a9aab_n.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Solar_farm_in_Wisconsin_01.jpg/1280px-Solar_farm_in_Wisconsin_01.jpg'],
  'Toamasina Fret Services': ['https://live.staticflickr.com/1617/25432477941_60fa4fda70_n.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Port_de_Toamasina.jpg/1280px-Port_de_Toamasina.jpg'],
  'Nosy Lodge & Tours': ['https://live.staticflickr.com/65535/53469205031_d4313a54b5_n.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Nosy-iranja-beach.jpg/1280px-Nosy-iranja-beach.jpg'],
  'Voyages Boréal': ['https://live.staticflickr.com/8715/16318815564_2f0bc68631_n.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Pink_Lake_in_Autumn.jpg/1280px-Pink_Lake_in_Autumn.jpg'],
  'Akanga Textile SARLU': ['https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Helmet_Guineafowl.jpg/330px-Helmet_Guineafowl.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Sambalpuri_Ikat_weaving_loom_%28Tanta%29_from_Odisha.jpg/1280px-Sambalpuri_Ikat_weaving_loom_%28Tanta%29_from_Odisha.jpg'],
  'BioCert Québec': ['https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Coloured_Erlenmeyer_flasks.jpg/330px-Coloured_Erlenmeyer_flasks.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Laboratory_scientist_conducts_an_experiment_with_a_Rotary_evaporator.jpg/1280px-Laboratory_scientist_conducts_an_experiment_with_a_Rotary_evaporator.jpg'],
  'Kintana Conseil': ['https://live.staticflickr.com/4106/35324467190_2acb04109c_n.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/University_of_Antananarivo_Madagascar.JPG/1280px-University_of_Antananarivo_Madagascar.JPG'],
  'Cacao Sambirano Coop': ['https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Cabosses_de_cacao%2C_Madagascar.jpg/330px-Cabosses_de_cacao%2C_Madagascar.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Plantation_du_cacao_sur_la_route_RN6_de_Madagascar_05.jpg/1280px-Plantation_du_cacao_sur_la_route_RN6_de_Madagascar_05.jpg'],
};

// [titre, date, format, lieu, capacité, diffusion, tarif membre, tarif public, j7, j1, h2, inscrits (clés membres), présents]
const EVENTS = [
  ['Accueil des nouveaux membres et présentation de la CanCham', '2026-11-12T09:00:00+03:00', 'Présentiel', 'Bureau de la CanCham, Soavimbahoaka', 30, 'Plateforme et page publique', null, null, true, true, false, ['m2', 'm3', 'm9', 'm11', 'm12'], []],
  ['Restitution MECC 9 — Mission économique et commerciale au Canada', '2026-11-20T15:00:00+03:00', 'Hybride', 'Antananarivo + en ligne', 120, 'Plateforme et page publique', null, 20000, true, true, true, ['m1', 'm3', 'm6', 'm7', 'm9', 'm10', 'm11'], []],
  ['Formation DBC — Exporter vers le Québec', '2026-11-26T18:00:00+03:00', 'Webinaire', 'En ligne', 80, 'Plateforme uniquement', 50000, 100000, false, true, true, ['m1', 'm5', 'm11', 'm14'], []],
  ['Formation DBC — Investissement & Joint Venture dans le tourisme et digital', '2026-10-20T18:00:00+03:00', 'Webinaire', 'En ligne', 80, 'Plateforme uniquement', 50000, 100000, false, false, false, [], []],
  ['Kit marketing, contenu visuel & présence digitale', '2026-10-12T14:00:00+03:00', 'Présentiel', 'Bureau de la CanCham, Soavimbahoaka', 80, 'Plateforme et page publique', 50000, 100000, false, false, false, ['m3', 'm9', 'm11'], ['m3', 'm9', 'm11']],
  ['Introduction au Canada pour les entrepreneurs malgaches', '2026-10-10T17:00:00+03:00', 'Webinaire', 'En ligne', 40, 'Plateforme et page publique', null, null, false, false, false, ['m1', 'm3', 'm5', 'm6', 'm9', 'm11', 'm14'], ['m1', 'm3', 'm5', 'm6', 'm9', 'm11']],
];

// [numéro, membre, objet, désignation, montant, devise, date, statut, mode]
const INVOICES = [
  ['0038', 'm8', 'cotisation', 'Cotisation annuelle d’adhésion', 500000, 'MGA', '2026-10-29', 'envoyee'],
  ['0037', 'm4', 'cotisation', 'Cotisation annuelle d’adhésion', 300, 'CAD', '2026-10-27', 'envoyee'],
  ['0036', 'm11', 'cotisation', 'Cotisation annuelle d’adhésion', 500000, 'MGA', '2026-10-20', 'payee', 'Mobile Money'],
  ['0031', 'm2', 'cotisation', 'Cotisation annuelle d’adhésion', 300, 'CAD', '2026-10-21', 'payee', 'Carte bancaire'],
  ['0029', 'm10', 'cotisation', 'Cotisation annuelle d’adhésion', 300, 'CAD', '2026-09-15', 'retard'],
  ['0027', 'm5', 'cotisation', 'Cotisation annuelle d’adhésion', 250000, 'MGA', '2026-09-02', 'retard'],
  ['0025', 'm3', 'evenement', 'Participation à l’atelier Kit marketing, contenu visuel & présence digitale', 50000, 'MGA', '2026-10-09', 'envoyee'],
  ['0024', 'm9', 'evenement', 'Participation à l’atelier Kit marketing, contenu visuel & présence digitale', 50000, 'MGA', '2026-10-09', 'payee', 'Carte bancaire'],
  ['0021', 'm6', 'cotisation', 'Cotisation annuelle d’adhésion', 500000, 'MGA', '2026-02-10', 'payee', 'Carte bancaire'],
  ['0019', 'm12', 'cotisation', 'Cotisation annuelle d’adhésion', 150, 'CAD', '2026-05-09', 'payee', 'Carte bancaire'],
];

const TEAM = [
  ['Ando', 'president@cancham.test', 'Administrateur', 'Présidente de la CanCham', true],
  ['Direction exécutive', 'direction@exemple.test', 'Administrateur', 'Directeur exécutif', true],
  ['Trésorerie', 'tresorerie@exemple.test', 'Administrateur', 'Trésorier', true],
  ['Communication', 'communication@exemple.test', 'Manager', 'Staff CanCham', true],
  ['Événements', 'evenements@exemple.test', 'Manager', 'Staff CanCham', true],
  ['Adhésions', 'adhesions@exemple.test', 'Manager', 'Staff CanCham', true],
  ['Stagiaire', 'stage@exemple.test', 'Manager', 'Staff CanCham', true],
  ['Ancien compte staff', 'staff@exemple.test', 'Manager', 'Staff CanCham', false],
];

const SUBSCRIBERS = [
  ['andry.r@exemple.test', 'Andry R.', 'Page publique', '2026-10-31', 'Abonné'],
  ['louis@bergeron-import.test', 'Louis Bergeron', 'Page publique', '2026-10-27', 'Abonné'],
  ['mamy.raj@exemple.test', 'Mamy Rajaona', 'Événement — Kit marketing', '2026-10-12', 'Abonné'],
  ['cdube@exemple.test', 'Chantal Dubé', 'Import CSV', '2026-09-30', 'Abonné'],
  ['toky@startup-exemple.test', 'Toky A.', 'Page publique', '2026-09-18', 'Abonné'],
  ['glapointe@exemple.test', 'Geneviève Lapointe', 'Page publique', '2026-09-02', 'Désabonné'],
  ['haja.r@exemple.test', 'Haja R.', 'Webinaire', '2026-08-21', 'Abonné'],
  ['n.girard@exemple.test', 'Nathalie Girard', 'Page publique', '2026-08-05', 'Abonné'],
  ['rina.r@exemple.test', 'Rina R.', 'Webinaire', '2026-06-30', 'Rebond'],
  ['fetra@ecoagri-exemple.test', 'Fetra R.', 'Page publique', '2026-07-29', 'Abonné'],
];

const LETTRE = `Bonjour à toutes et à tous,

Ce mois-ci : la restitution de la MECC 9 le 20 novembre, une nouvelle formation « Exporter vers le Québec » et l’accueil de nos nouveaux membres.

Au plaisir de vous retrouver,
L’équipe de la CanCham`;

async function run() {
  const q = (sql, vals) => client.query(sql, vals).then(r => r.rows);
  const ins = async (table, obj) => {
    const cols = Object.keys(obj);
    const [row] = await q(`insert into ${table} (${cols.join(', ')}) values (${cols.map((_, i) => '$' + (i + 1)).join(', ')}) returning *`, Object.values(obj));
    return row;
  };
  const histo = (...items) => JSON.stringify(items.map(([d, t]) => ({ d, t })));

  if (RESET) {
    await q(`truncate secteurs, formules, members, contacts, connections, events, event_registrations, agenda_rappels, rdv_types, rendez_vous,
             news, dossiers, fichiers, services, threads, messages, outbox, campaigns, subscribers, invoices, reglements,
             platform_invoices, notifications, journal restart identity cascade`);
    await q('delete from team_users where password_hash is null');
    await q(`delete from avatars where kind = 'member' or (kind = 'user' and ref_id not in (select id from team_users))`);
    await q(`select setval('invoice_seq', 1, false)`);
  } else if ((await q('select count(*)::int n from members'))[0].n > 0) {
    throw new Error('La base contient déjà des membres. Relancez avec « npm run db:seed -- --reset » pour tout remplacer.');
  }

  // Réglages : seulement s'ils n'ont pas déjà été saisis
  const settings = {
    org: { nom: 'Chambre de Commerce et de Coopération Canada–Madagascar', court: 'CanCham Madagascar', adresse: 'Lot II A 118 Soavimbahoaka', ville: 'Antananarivo 101, Madagascar', courriel: 'info@cancham.test', tel: '+261 34 00 000 00', site: 'https://cancham.mg/', nif: '000 000 000 0', stat: '00000 00 0000 000000', tpsRate: 5, tvqRate: 9.975, taxesCAD: false, modalites: 'Règlement à l’ordre de la chambre, en espèces, par virement ou par Mobile Money. Rappelez le numéro de facture avec votre paiement.' },
    relances: { avant30: true, avant7: true, apres1: true, apres7: true, apres15: false, apres30: false, notif: true, courriel: true, autoRetard: true },
    saas: { plan: 'L’Alliée Virtuelle, formule Chambre', base: 150, parUser: 15, prochaine: '2026-12-01', moyen: 'Carte bancaire •••• 8810', tpsRate: 5, tvqRate: 9.975 },
  };
  for (const [cle, valeur] of Object.entries(settings))
    await q('insert into settings (cle, valeur) values ($1, $2) on conflict (cle) do nothing', [cle, JSON.stringify(valeur)]);

  const secteur = {}, formule = {}, member = {};
  for (const nom of SECTEURS) secteur[nom] = (await ins('secteurs', { nom })).id;
  for (const [k, [nom, prix, devise]] of Object.entries(FORMULES)) formule[k] = (await ins('formules', { nom, prix, devise })).id;

  for (const [k, nom, sect, pays, ville, f, statut, depuis, renouv, acces, [cnom, fn, email, tel], description, besoins, interets, offres, auto, prel, moyen] of MEMBERS) {
    const m = await ins('members', { nom, secteur_id: secteur[sect], pays, ville, formule_id: formule[f], statut, membre_depuis: depuis, renouvellement: renouv, acces, description, besoins, interets, offres, renouvellement_auto: auto, prelevement: prel, moyen_paiement: moyen });
    member[k] = m;
    if (IMAGES[nom]) await q('update members set logo_url = $1, couverture_url = $2 where id = $3', [...IMAGES[nom], m.id]);
    await ins('contacts', { member_id: m.id, nom: cnom, fonction: fn, email, tel, principal: true });
  }
  await ins('contacts', { member_id: member.m9.id, nom: 'Hery Rabe', fonction: 'Responsable commercial', email: 'hery@nosylodge.test', tel: '+261 32 66 666 67', principal: false });
  await ins('connections', { member_a: member.m6.id, member_b: member.m7.id, statut: 'relation', note: 'Présentés lors de la MECC 9 : équipements solaires pour sites isolés.' });

  for (const [titre, date, format, lieu, capacite, diffusion, tm, tp, j7, j1, h2, inscrits, presents] of EVENTS) {
    const e = await ins('events', { titre, date_debut: date, format, lieu, capacite, diffusion, tarif_membre: tm, tarif_public: tp, rappel_j7: j7, rappel_j1: j1, rappel_h2: h2 });
    for (const k of inscrits) {
      const [c] = await q('select nom, email from contacts where member_id = $1 and principal', [member[k].id]);
      await ins('event_registrations', { event_id: e.id, member_id: member[k].id, nom: c.nom, email: c.email, present: presents.includes(k) });
    }
    if (titre.startsWith('Restitution')) await ins('event_registrations', { event_id: e.id, nom: 'Mamy Rajaona', email: 'mamy.raj@exemple.test' });
  }

  await ins('agenda_rappels', { titre: 'Préparer le dossier de restitution MECC 9', date_debut: '2026-11-16T10:00:00+03:00', note: 'Photos, chiffres clés, témoignages des participants.' });
  await ins('agenda_rappels', { titre: 'Réunion du conseil d’administration', date_debut: '2026-11-25T16:00:00+03:00', note: 'Ordre du jour : bilan des adhésions, budget 2027.' });

  const t1 = await ins('rdv_types', { nom: 'Tournage de vidéo de présentation', duree_min: 120, note: 'Offert avec votre adhésion', disponibilites: ['Lundi 09 h 00 – 16 h 00', 'Mardi 09 h 00 – 16 h 00', 'Mercredi 09 h 00 – 16 h 00'] });
  const t2 = await ins('rdv_types', { nom: 'RDV avec un responsable', duree_min: 30, note: 'Discutons de vos besoins', disponibilites: ['Lundi 09 h 00 – 12 h 00', 'Mercredi 14 h 00 – 16 h 00', 'Jeudi 09 h 00 – 16 h 00', 'Vendredi 14 h 00 – 16 h 00'] });
  await ins('rendez_vous', { type_id: t1.id, member_id: member.m9.id, date_debut: '2026-11-04T09:00:00+03:00' });
  await ins('rendez_vous', { type_id: t2.id, member_id: member.m3.id, date_debut: '2026-11-06T10:00:00+03:00' });

  for (const [titre, categorie, date_pub, publie, likes, commentaires] of [
    ['C’est parti pour notre mission économique et commerciale au Canada !', 'Vie de la chambre', '2026-10-28', true, 1, 0],
    ['MECC 9 – 2026 | Une équipe prête, une aventure qui commence !', 'Vie de la chambre', '2026-10-26', true, 3, 1],
    ['Opportunité pour les PME à Madagascar | Recrutement des bénéficiaires du projet TRISEG', 'Programmation', '2026-10-21', false, 0, 0],
    ['MECC 8 restituée, MECC 9 lancée : la mission continue', 'Vie de la chambre', '2026-09-22', true, 0, 0]])
    await ins('news', { titre, categorie, date_pub, publie, likes, commentaires, contenu: titre + '\n\nArticle de démonstration.' });

  for (const [nom, acces] of [['AGENDA TOURISME', 'Réservé à 13 entreprises'], ['MECC - octobre 2026', 'Réservé à 16 entreprises'], ['AGENDA DIGITAL', 'Réservé à 3 entreprises'], ['CANADA - BIENVENUE', 'Réservé à 2 entreprises'], ['BIENVENUE - MADAGASCAR', 'Tous les membres']]) {
    const d = await ins('dossiers', { nom, acces, payant: false });
    const txt = `Document de démonstration du dossier « ${nom} ».\n`;
    await ins('fichiers', { dossier_id: d.id, nom: 'Lisez-moi.txt', type: 'text/plain', taille: Buffer.byteLength(txt), contenu: Buffer.from(txt) });
  }

  for (const [nom, prix, description] of [
    ['Tournage de vidéo de présentation', null, 'Tournage, montage et diffusion d’une vidéo de présentation auprès de la communauté d’affaires.'],
    ['Co-Lab', null, 'Organisez votre événement avec la CanCham : salle, captation vidéo, inscriptions et promotion.'],
    ['Travaillez et recevez chez nous', null, 'Réservez un bureau pour travailler ou recevoir un client dans les locaux de la CanCham.'],
    ['Mission économique et commerciale au Canada', 15000000, 'Délégation annuelle : rencontres d’affaires ciblées, salons et institutions canadiennes.'],
    ['Canada expo', 100000, 'Présence de vos produits sur le stand collectif CanCham.']])
    await ins('services', { nom, prix, description });

  for (const [k, sujet, msgs] of [
    ['m8', 'Adhésion et cotisation — Paiement', [[false, 'Bonjour, comment pouvons-nous régler la cotisation ? Mobile Money ou virement ?', '2026-10-29T12:39:00+03:00']]],
    ['m3', 'Réservation — Tournage de vidéo de présentation', [[false, 'Bonjour, je souhaite réserver « Tournage de vidéo de présentation », inclus dans mon adhésion. Quelles sont les disponibilités ?', '2026-10-02T09:20:00+03:00'], [true, 'Bonjour Andry, le créneau du 6 novembre à 10 h vous convient-il ?', '2026-10-02T11:02:00+03:00']]],
    ['m10', 'Adhésion et cotisation — Renouvellement', [[false, 'Quelle est la procédure pour renouveler depuis le Canada ?', '2026-10-15T17:10:00+03:00'], [true, 'Bonjour, vous avez dans votre profil une option pour payer la cotisation par carte bancaire.', '2026-10-17T08:30:00+03:00']]]]) {
    const t = await ins('threads', { member_id: member[k].id, sujet, created_at: msgs[0][2] });
    for (const [de_nous, texte, created_at] of msgs) await ins('messages', { thread_id: t.id, de_nous, texte, created_at });
  }

  for (const [email, nom, source, date_inscription, statut] of SUBSCRIBERS) await ins('subscribers', { email, nom, source, date_inscription, statut });

  for (const [titre, statut, date_envoi, destinataires, taux_ouverture, taux_clic] of [
    ['La lettre CanCham — Novembre 2026', 'Programmée', '2026-11-04T08:00:00+03:00', 20, null, null],
    ['Édition spéciale — Restitution MECC 9', 'Brouillon', null, null, null, null],
    ['La lettre CanCham — Octobre 2026', 'Envoyée', '2026-10-02T08:00:00+03:00', 118, 51.2, 14.0],
    ['La lettre CanCham — Septembre 2026', 'Envoyée', '2026-09-03T08:00:00+03:00', 104, 47.1, 11.5]])
    await ins('campaigns', { titre, statut, date_envoi, destinataires, taux_ouverture, taux_clic, contenu: LETTRE });

  await ins('outbox', { type: 'courriel', sujet: 'Dernières places — Accueil des nouveaux membres', audience: 'Membres à jour', date_envoi: '2026-11-03T09:00:00+03:00', statut: 'programmé', contenu: 'Il reste quelques places pour la matinée d’accueil du 12 novembre. Inscrivez-vous vite !' });

  const invoice = {};
  for (const [n, k, objet, des, mt, devise, date, statut, mode] of INVOICES) {
    const h = [[date + 'T09:00:00+03:00', 'Facture émise et envoyée par courriel']];
    const ech = new Date(date + 'T12:00:00Z'); ech.setUTCDate(ech.getUTCDate() + 30);
    const echeance = ech.toISOString().slice(0, 10);
    if (statut === 'payee') h.push([date + 'T16:00:00+03:00', `Paiement enregistré (${mode})`]);
    if (statut === 'retard') h.push([echeance + 'T00:05:00+03:00', 'Passée en retard automatiquement à l’échéance'], [echeance + 'T09:00:00+03:00', 'Relance J+1 par notification et courriel']);
    invoice[n] = await ins('invoices', { numero: 'CC-2026-' + n, member_id: member[k].id, objet, lignes: JSON.stringify([{ des, mt }]), devise, date_emission: date, echeance, statut, mode_paiement: mode ?? null, nb_relances: statut === 'retard' ? 1 : 0, historique: histo(...h) });
  }
  await q(`select setval('invoice_seq', 38)`);   // la prochaine facture sera CC-2026-0039
  await ins('reglements', { reference: 'CC-2026-9LTTGK', invoice_id: invoice['0025'].id, moyen: 'MVola', annonce_le: '2026-10-30T18:21:00+03:00', statut: 'annoncé' });

  for (const [nom, email, role, fonction, actif] of TEAM)
    await q('insert into team_users (nom, email, role, fonction, actif) values ($1, $2, $3, $4, $5) on conflict (email) do nothing', [nom, email, role, fonction, actif]);

  // Groupe de discussion : deux collègues et deux membres (visible par toute l'équipe, puisqu'il inclut des membres)
  const team = Object.fromEntries((await q('select id, email from team_users')).map(r => [r.email, r.id]));
  const g = await ins('threads', { type: 'groupe', sujet: 'Préparation de la restitution MECC 9', created_by: team['direction@exemple.test'], created_at: '2026-10-27T10:00:00+03:00' });
  for (const uid of [team['direction@exemple.test'], team['communication@exemple.test']]) await ins('thread_participants', { thread_id: g.id, user_id: uid });
  for (const k of ['m1', 'm6']) await ins('thread_participants', { thread_id: g.id, member_id: member[k].id });
  for (const [who, texte, created_at] of [
    [{ author_user_id: team['direction@exemple.test'], de_nous: true }, 'Bonjour à tous, la restitution aura lieu le 20 novembre à 15 h. Pouvez-vous chacun préparer 3 diapositives sur vos rencontres au Canada ?', '2026-10-27T10:05:00+03:00'],
    [{ author_member_id: member.m6.id, de_nous: false }, 'Avec plaisir. Je parlerai du partenariat avec Nordik Solaire. (réponse reçue par courriel)', '2026-10-27T15:40:00+03:00'],
    [{ author_user_id: team['communication@exemple.test'], de_nous: true }, 'Merci ! Je m’occupe de l’affiche et des photos de la mission.', '2026-10-28T09:12:00+03:00']])
    await ins('messages', { thread_id: g.id, texte, created_at, ...who });
  for (const [numero, date_facture, nb_utilisateurs] of [['PLT-2026-10', '2026-10-01', 7], ['PLT-2026-09', '2026-09-01', 7], ['PLT-2026-08', '2026-08-01', 6]])
    await ins('platform_invoices', { numero, date_facture, nb_utilisateurs, montant: Math.round((150 + nb_utilisateurs * 15) * 1.14975 * 100) / 100 });

  for (const [texte, lien, created_at] of [
    ['Nouvelle demande d’adhésion : Cacao Sambirano Coop', `/membres/${member.m14.id}`, '2026-10-30T22:17:00+03:00'],
    ['Règlement annoncé : CC-2026-9LTTGK par MVola', '/reglements', '2026-10-30T18:21:00+03:00'],
    ['Facture CC-2026-0029 passée en retard (Voyages Boréal)', `/paiements/${invoice['0029'].id}`, '2026-10-15T00:05:00+03:00']])
    await ins('notifications', { texte, lien, created_at });

  for (const [categorie, titre, detail, par, created_at] of [
    ['Communication', 'Inscription à la lettre d’information', 'andry.r@exemple.test', 'Visiteur', '2026-10-31T05:07:00+03:00'],
    ['Contenus', 'Ressource modifiée', '« Mardi 3 novembre 2026 » · page de 1 bloc.', 'Ando', '2026-10-31T03:55:00+03:00'],
    ['Adhésions', 'Contact ajouté', 'Ajout d’un contact chez Nosy Lodge & Tours, invité à choisir son mot de passe.', 'Adhésions', '2026-10-31T02:40:00+03:00'],
    ['Adhésions', 'Demande d’adhésion déposée', 'Demande de Cacao Sambirano Coop.', 'Lova Ramanantsoa', '2026-10-30T22:17:00+03:00'],
    ['Paiements', 'Paiement enregistré', '300 $ par carte bancaire pour Maple Gourmet Distribution.', 'Trésorerie', '2026-10-21T20:28:00+03:00']])
    await ins('journal', { categorie, titre, detail, par, created_at });
}

try {
  await client.connect();
  await client.query('begin');
  await run();
  await client.query('commit');
  const [c] = (await client.query(`select (select count(*) from members) m, (select count(*) from invoices) f, (select count(*) from events) e, (select count(*) from subscribers) a`)).rows;
  console.log(`Données de test ajoutées : ${c.m} membres, ${c.f} factures, ${c.e} événements, ${c.a} abonnés, plus contacts, messages, ressources…`);
} catch (e) {
  await client.query('rollback').catch(() => {});
  console.error('Échec :', e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
