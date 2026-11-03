// Description des modules : sert à la fois à l'API (colonnes autorisées)
// et à l'interface (tableaux et formulaires).

export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'datetime' | 'bool' | 'select' | 'tags' | 'ref' | 'lignes' | 'password';
export type Opt = string | [value: string, label: string];
export type Field = {
  name: string;
  label: string;
  type?: FieldType;      // text par défaut
  options?: Opt[];       // pour select
  ref?: string;          // table liée, pour ref
  required?: boolean;
  list?: boolean;        // affiché dans le tableau
  readonly?: boolean;    // rempli par la base, jamais envoyé
  filter?: boolean;      // filtre proposé au-dessus du tableau (select)
  hint?: string;
};
export type Resource = {
  table: string; title: string; label: string; fields: Field[]; orderBy: string;
  select?: string;       // requête de lecture si elle diffère de « select * » (colonnes calculées)
  admin?: boolean;       // écriture réservée aux administrateurs
};

const STATUTS_MEMBRE: Opt[] = [['demande', 'Demande'], ['attente', 'En attente de paiement'], ['a_jour', 'À jour'], ['retard', 'En retard'], ['refusee', 'Refusée']];
const MOYENS = ['MVola', 'Orange Money', 'Airtel Money', 'Virement', 'Espèces', 'Carte bancaire'];
const created: Field = { name: 'created_at', label: 'Date', type: 'datetime', list: true, readonly: true };

const list: Resource[] = [
  { table: 'members', title: 'Membres', label: 'nom', orderBy: 'nom', fields: [
    { name: 'nom', label: 'Entreprise', required: true, list: true },
    { name: 'secteur_id', label: 'Secteur', type: 'ref', ref: 'secteurs', list: true },
    { name: 'pays', label: 'Pays', type: 'select', options: [['MG', 'Madagascar'], ['CA', 'Canada']], list: true, filter: true },
    { name: 'ville', label: 'Ville', list: true },
    { name: 'formule_id', label: 'Formule', type: 'ref', ref: 'formules' },
    { name: 'statut', label: 'Statut', type: 'select', options: STATUTS_MEMBRE, list: true, filter: true },
    { name: 'membre_depuis', label: 'Membre depuis', type: 'date' },
    { name: 'renouvellement', label: 'Renouvellement', type: 'date', list: true },
    { name: 'acces', label: 'Accès plateforme', type: 'select', options: [['aucun', 'Aucun'], ['lien', 'Lien envoyé'], ['actif', 'Actif']] },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'besoins', label: 'Besoins', type: 'tags', hint: 'Séparés par des virgules. Servent à suggérer des rapprochements.' },
    { name: 'offres', label: 'Produits & services proposés', type: 'tags', hint: 'Séparés par des virgules.' },
    { name: 'interets', label: 'Centres d’intérêt', type: 'tags', hint: 'Séparés par des virgules.' },
    { name: 'renouvellement_auto', label: 'Renouvellement automatique', type: 'bool' },
    { name: 'prelevement', label: 'Prélèvement autorisé', type: 'bool' },
    { name: 'moyen_paiement', label: 'Moyen de paiement enregistré' },
  ] },
  { table: 'contacts', title: 'Contacts', label: 'nom', orderBy: 'nom', fields: [
    { name: 'member_id', label: 'Membre', type: 'ref', ref: 'members', required: true, list: true },
    { name: 'nom', label: 'Nom', required: true, list: true },
    { name: 'fonction', label: 'Fonction', list: true },
    { name: 'email', label: 'Courriel', list: true },
    { name: 'tel', label: 'Téléphone', list: true },
    { name: 'principal', label: 'Contact principal', type: 'bool', list: true },
  ] },
  { table: 'connections', title: 'Mises en relation', label: 'id', orderBy: 'created_at desc', fields: [
    { name: 'member_a', label: 'Membre A', type: 'ref', ref: 'members', required: true, list: true },
    { name: 'member_b', label: 'Membre B', type: 'ref', ref: 'members', required: true, list: true },
    { name: 'statut', label: 'Statut', type: 'select', options: [['relation', 'Mis en relation'], ['ignoree', 'Ignorée']], list: true },
    { name: 'note', label: 'Note', type: 'textarea' },
    created,
  ] },
  { table: 'formules', title: 'Formules d’adhésion', label: 'nom', orderBy: 'nom', fields: [
    { name: 'nom', label: 'Nom', required: true, list: true },
    { name: 'prix', label: 'Prix', type: 'number', list: true, hint: 'Vide = sur devis.' },
    { name: 'devise', label: 'Devise', type: 'select', options: ['MGA', 'CAD'], list: true },
  ] },
  { table: 'secteurs', title: 'Secteurs d’activité', label: 'nom', orderBy: 'nom', fields: [
    { name: 'nom', label: 'Secteur', required: true, list: true },
  ] },
  { table: 'events', title: 'Événements', label: 'titre', orderBy: 'date_debut desc',
    select: `select e.*, (select count(*) from event_registrations r where r.event_id = e.id)::int as inscrits,
                    (select count(*) from event_registrations r where r.event_id = e.id and r.present)::int as presents from events e`, fields: [
    { name: 'titre', label: 'Titre', required: true, list: true },
    { name: 'date_debut', label: 'Date', type: 'datetime', required: true, list: true },
    { name: 'format', label: 'Format', type: 'select', options: ['Présentiel', 'Hybride', 'Webinaire'], list: true },
    { name: 'lieu', label: 'Lieu' },
    { name: 'capacite', label: 'Capacité', type: 'number', list: true },
    { name: 'inscrits', label: 'Inscrits', type: 'number', list: true, readonly: true },
    { name: 'presents', label: 'Présents', type: 'number', list: true, readonly: true },
    { name: 'diffusion', label: 'Diffusion', type: 'select', options: ['Plateforme uniquement', 'Plateforme et page publique'] },
    { name: 'tarif_membre', label: 'Tarif membre (Ar)', type: 'number', hint: 'Vide = gratuit.' },
    { name: 'tarif_public', label: 'Tarif public (Ar)', type: 'number', hint: 'Vide = gratuit.' },
    { name: 'rappel_j7', label: 'Rappel 7 jours avant', type: 'bool' },
    { name: 'rappel_j1', label: 'Rappel la veille', type: 'bool' },
    { name: 'rappel_h2', label: 'Rappel 2 heures avant', type: 'bool' },
  ] },
  { table: 'event_registrations', title: 'Inscriptions aux événements', label: 'nom', orderBy: 'created_at desc', fields: [
    { name: 'event_id', label: 'Événement', type: 'ref', ref: 'events', required: true, list: true, filter: true },
    { name: 'member_id', label: 'Membre', type: 'ref', ref: 'members', list: true },
    { name: 'nom', label: 'Nom', required: true, list: true },
    { name: 'email', label: 'Courriel', list: true },
    { name: 'present', label: 'Présent', type: 'bool', list: true },
  ] },
  { table: 'agenda_rappels', title: 'Rappels de l’équipe', label: 'titre', orderBy: 'date_debut', fields: [
    { name: 'titre', label: 'Titre', required: true, list: true },
    { name: 'date_debut', label: 'Date', type: 'datetime', required: true, list: true },
    { name: 'note', label: 'Note', type: 'textarea', list: true },
  ] },
  { table: 'rdv_types', title: 'Types de rendez-vous', label: 'nom', orderBy: 'nom', fields: [
    { name: 'nom', label: 'Nom', required: true, list: true },
    { name: 'duree_min', label: 'Durée (minutes)', type: 'number', list: true },
    { name: 'note', label: 'Note', list: true },
    { name: 'disponibilites', label: 'Disponibilités', type: 'tags', list: true, hint: 'Ex. : Lundi 09 h 00 – 12 h 00, Jeudi 14 h 00 – 16 h 00' },
  ] },
  { table: 'rendez_vous', title: 'Rendez-vous', label: 'id', orderBy: 'date_debut desc', fields: [
    { name: 'type_id', label: 'Type', type: 'ref', ref: 'rdv_types', required: true, list: true },
    { name: 'member_id', label: 'Membre', type: 'ref', ref: 'members', required: true, list: true },
    { name: 'date_debut', label: 'Date', type: 'datetime', required: true, list: true },
    { name: 'note', label: 'Note', type: 'textarea' },
  ] },
  { table: 'news', title: 'Actualités', label: 'titre', orderBy: 'date_pub desc', fields: [
    { name: 'titre', label: 'Titre', required: true, list: true },
    { name: 'categorie', label: 'Catégorie', type: 'select', options: ['Vie de la chambre', 'Programmation', 'Opportunités'], list: true },
    { name: 'date_pub', label: 'Date', type: 'date', list: true },
    { name: 'publie', label: 'Publié', type: 'bool', list: true },
    { name: 'contenu', label: 'Contenu', type: 'textarea' },
  ] },
  { table: 'dossiers', title: 'Ressources', label: 'nom', orderBy: 'nom',
    select: 'select d.*, (select count(*) from fichiers f where f.dossier_id = d.id)::int as nb_fichiers from dossiers d', fields: [
    { name: 'nom', label: 'Dossier', required: true, list: true },
    { name: 'nb_fichiers', label: 'Fichiers', type: 'number', list: true, readonly: true },
    { name: 'acces', label: 'Accès', list: true, hint: 'Ex. : Tous les membres' },
    { name: 'payant', label: 'Payant', type: 'bool', list: true },
  ] },
  { table: 'services', title: 'Services CanCham', label: 'nom', orderBy: 'nom', fields: [
    { name: 'nom', label: 'Service', required: true, list: true },
    { name: 'prix', label: 'Prix (Ar)', type: 'number', list: true, hint: 'Vide = inclus dans l’adhésion.' },
    { name: 'description', label: 'Description', type: 'textarea', list: true },
  ] },
  { table: 'threads', title: 'Conversations', label: 'sujet', orderBy: 'created_at desc', fields: [
    { name: 'member_id', label: 'Membre', type: 'ref', ref: 'members', required: true, list: true },
    { name: 'sujet', label: 'Sujet', required: true, list: true },
    created,
  ] },
  { table: 'campaigns', title: 'Newsletter', label: 'titre', orderBy: 'date_envoi desc nulls first', fields: [
    { name: 'titre', label: 'Lettre', required: true, list: true },
    { name: 'statut', label: 'Statut', type: 'select', options: ['Brouillon', 'Programmée', 'Envoyée'], list: true, filter: true, hint: 'Programmée : envoi automatique à la date indiquée, aux adhérents et aux abonnés.' },
    { name: 'date_envoi', label: 'Envoi', type: 'datetime', list: true },
    { name: 'destinataires', label: 'Destinataires', type: 'number', list: true },
    { name: 'taux_ouverture', label: 'Ouverture (%)', type: 'number', list: true },
    { name: 'taux_clic', label: 'Clics (%)', type: 'number', list: true },
    { name: 'contenu', label: 'Contenu', type: 'textarea', hint: 'Texte de la lettre. Un lien de désabonnement est ajouté automatiquement pour les abonnés.' },
  ] },
  { table: 'subscribers', title: 'Abonnés à la lettre', label: 'email', orderBy: 'date_inscription desc', fields: [
    { name: 'email', label: 'Courriel', required: true, list: true },
    { name: 'nom', label: 'Nom', list: true },
    { name: 'source', label: 'Source', list: true },
    { name: 'date_inscription', label: 'Inscription', type: 'date', list: true },
    { name: 'statut', label: 'Statut', type: 'select', options: ['Abonné', 'Désabonné', 'Rebond'], list: true, filter: true },
  ] },
  { table: 'outbox', title: 'Envois programmés', label: 'sujet', orderBy: 'date_envoi desc nulls first, id desc', fields: [
    { name: 'sujet', label: 'Sujet', required: true, list: true },
    { name: 'audience', label: 'Destinataires', type: 'select', options: ['Adhérents', 'Membres à jour', 'Abonnés à la lettre', 'Adhérents + abonnés', 'Adresses libres'], list: true },
    { name: 'destinataires', label: 'Adresses', hint: 'Adresses supplémentaires, séparées par des virgules.' },
    { name: 'date_envoi', label: 'Envoi', type: 'datetime', list: true, hint: 'Vide = envoi dans les 10 minutes.' },
    { name: 'contenu', label: 'Message', type: 'textarea' },
    { name: 'type', label: 'Type', type: 'select', options: ['courriel', 'newsletter', 'notification'], list: true, filter: true },
    { name: 'nb', label: 'Nombre', type: 'number', list: true, readonly: true },
    { name: 'statut', label: 'Statut', type: 'select', options: ['programmé', 'envoyé', 'annulé', 'échec'], list: true, filter: true },
    { name: 'erreur', label: 'Erreur', list: true, readonly: true },
  ] },
  { table: 'invoices', title: 'Paiements & factures', label: 'numero', orderBy: 'date_emission desc, numero desc', fields: [
    { name: 'numero', label: 'Numéro', list: true, hint: 'Vide = attribué automatiquement (CC-AAAA-0001).' },
    { name: 'member_id', label: 'Membre', type: 'ref', ref: 'members', required: true, list: true },
    { name: 'objet', label: 'Objet', type: 'select', options: [['cotisation', 'Cotisation'], ['evenement', 'Événement'], ['service', 'Service'], ['autre', 'Autre']], hint: 'Une cotisation payée met le membre à jour pour un an.' },
    { name: 'lignes', label: 'Montant', type: 'lignes', list: true },
    { name: 'devise', label: 'Devise', type: 'select', options: ['MGA', 'CAD'], list: true },
    { name: 'date_emission', label: 'Émise le', type: 'date', list: true },
    { name: 'echeance', label: 'Échéance', type: 'date', list: true, hint: 'Vide = 30 jours après l’émission.' },
    { name: 'statut', label: 'Statut', type: 'select', options: [['envoyee', 'Envoyée'], ['payee', 'Payée'], ['retard', 'En retard'], ['annulee', 'Annulée']], list: true, filter: true },
    { name: 'mode_paiement', label: 'Mode de paiement', type: 'select', options: MOYENS },
    { name: 'nb_relances', label: 'Relances envoyées', type: 'number' },
  ] },
  { table: 'reglements', title: 'Règlements annoncés', label: 'reference', orderBy: 'annonce_le desc', fields: [
    { name: 'reference', label: 'Référence', required: true, list: true },
    { name: 'invoice_id', label: 'Facture', type: 'ref', ref: 'invoices', list: true },
    { name: 'moyen', label: 'Moyen', type: 'select', options: MOYENS, list: true },
    { name: 'annonce_le', label: 'Annoncé le', type: 'datetime', list: true },
    { name: 'statut', label: 'Statut', type: 'select', options: ['annoncé', 'confirmé', 'rejeté'], list: true, filter: true },
  ] },
  { table: 'team_users', title: 'Équipe & accès', label: 'nom', orderBy: 'nom', admin: true, fields: [
    { name: 'nom', label: 'Nom', required: true, list: true },
    { name: 'email', label: 'Courriel', required: true, list: true },
    { name: 'role', label: 'Rôle', type: 'select', options: ['Administrateur', 'Manager'], list: true },
    { name: 'fonction', label: 'Fonction', list: true },
    { name: 'actif', label: 'Actif', type: 'bool', list: true },
    { name: 'password', label: 'Mot de passe', type: 'password', hint: '8 caractères minimum. Laisser vide pour ne pas le changer.' },
    { name: 'derniere_connexion', label: 'Dernière connexion', type: 'datetime', list: true, readonly: true },
  ] },
  { table: 'platform_invoices', title: 'Factures de la plateforme', label: 'numero', orderBy: 'date_facture desc', admin: true, fields: [
    { name: 'numero', label: 'Numéro', required: true, list: true },
    { name: 'date_facture', label: 'Date', type: 'date', list: true },
    { name: 'nb_utilisateurs', label: 'Utilisateurs', type: 'number', list: true },
    { name: 'montant', label: 'Montant ($ CA)', type: 'number', list: true },
  ] },
  { table: 'notifications', title: 'Notifications', label: 'texte', orderBy: 'created_at desc', fields: [
    { name: 'texte', label: 'Notification', required: true, list: true },
    { name: 'lu', label: 'Lue', type: 'bool', list: true },
    created,
  ] },
  { table: 'journal', title: 'Journal d’activité', label: 'titre', orderBy: 'created_at desc', fields: [
    { name: 'categorie', label: 'Catégorie', type: 'select', options: ['Adhésions', 'Paiements', 'Contenus', 'Événements', 'Communication', 'Équipe', 'Système'], list: true, filter: true },
    { name: 'titre', label: 'Action', required: true, list: true },
    { name: 'detail', label: 'Détail', type: 'textarea', list: true },
    { name: 'par', label: 'Par', list: true },
    created,
  ] },
];

export const RESOURCES: Record<string, Resource> = Object.fromEntries(list.map(r => [r.table, r]));

// Menu. table vide = page dédiée ; icon = clé de components/Icon.tsx ;
// badge : 'demandes' affiche le nombre de demandes d'adhésion à traiter
// parent : page absente du menu (comme dans la maquette), accessible depuis la page parente qui reste surlignée
export type NavItem = { slug: string; label: string; icon: string; table?: string; badge?: 'demandes'; parent?: string };
export const NAV: [string, NavItem[]][] = [
  ['Pilotage', [
    { slug: '', label: 'Tableau de bord', icon: 'dash' },
    { slug: 'journal', label: 'Journal d’activité', icon: 'log', table: 'journal' },
    { slug: 'equipe', label: 'Équipe & accès', icon: 'team', table: 'team_users' },
  ]],
  ['Adhérents', [
    { slug: 'membres', label: 'Membres', icon: 'users', table: 'members', badge: 'demandes' },
    { slug: 'contacts', label: 'Contacts', icon: 'userplus', table: 'contacts', parent: 'membres' },
    { slug: 'annuaire', label: 'Annuaire', icon: 'book' },
    { slug: 'mises-en-relation', label: 'Mises en relation', icon: 'spark', table: 'connections', parent: 'annuaire' },
  ]],
  ['Programme', [
    { slug: 'evenements', label: 'Événements', icon: 'cal', table: 'events' },
    { slug: 'inscriptions', label: 'Inscriptions', icon: 'userplus', table: 'event_registrations', parent: 'evenements' },
    { slug: 'agenda', label: 'Agenda', icon: 'agenda' },
    { slug: 'rendez-vous', label: 'Rendez-vous', icon: 'clock', table: 'rendez_vous' },
    { slug: 'types-rendez-vous', label: 'Types de rendez-vous', icon: 'list', table: 'rdv_types', parent: 'rendez-vous' },
    { slug: 'actualites', label: 'Actualités', icon: 'news', table: 'news' },
    { slug: 'ressources', label: 'Ressources', icon: 'folder', table: 'dossiers' },
    { slug: 'services', label: 'Services CanCham', icon: 'gift', table: 'services' },
  ]],
  ['Communication', [
    { slug: 'messagerie', label: 'Messagerie', icon: 'chat' },
    { slug: 'newsletter', label: 'Newsletter', icon: 'mail', table: 'campaigns' },
    { slug: 'lettre', label: 'Abonnés à la lettre', icon: 'list', table: 'subscribers' },
    { slug: 'envois', label: 'Envois programmés', icon: 'send', table: 'outbox', parent: 'newsletter' },
  ]],
  ['Finances', [
    { slug: 'paiements', label: 'Paiements & factures', icon: 'file', table: 'invoices' },
    { slug: 'reglements', label: 'Règlements annoncés', icon: 'coin', table: 'reglements' },
    { slug: 'facturation', label: 'Réglages de facturation', icon: 'gear' },
    { slug: 'formules', label: 'Formules d’adhésion', icon: 'card', table: 'formules', parent: 'facturation' },
    { slug: 'secteurs', label: 'Secteurs d’activité', icon: 'tag', table: 'secteurs', parent: 'facturation' },
  ]],
  ['Plateforme', [
    { slug: 'abonnement', label: 'Abonnement & utilisateurs', icon: 'star' },
  ]],
];

// Groupes affichés comme rubriques dépliables (avec leur icône) ; les autres groupes sont des liens directs
export const GROUP_ICON: Record<string, string> = { Adhérents: 'users', Programme: 'cal', Communication: 'chat', Finances: 'coin' };

export const PAGES: Record<string, { group: string; table: string }> = Object.fromEntries(
  NAV.flatMap(([group, items]) => items.filter(i => i.table).map(i => [i.slug, { group, table: i.table! }]))
);

// Champs des réglages (table settings, une ligne par clé)
export const SETTINGS: Record<string, { title: string; fields: Field[] }> = {
  org: { title: 'Informations de la chambre', fields: [
    { name: 'nom', label: 'Nom complet' }, { name: 'court', label: 'Nom court' },
    { name: 'adresse', label: 'Adresse' }, { name: 'ville', label: 'Ville' },
    { name: 'courriel', label: 'Courriel' }, { name: 'tel', label: 'Téléphone' }, { name: 'site', label: 'Site web' },
    { name: 'nif', label: 'NIF' }, { name: 'stat', label: 'STAT' },
    { name: 'neq', label: 'NEQ (Québec)' }, { name: 'tps', label: 'N° TPS' }, { name: 'tvq', label: 'N° TVQ' },
    { name: 'taxesCAD', label: 'Appliquer TPS/TVQ aux factures en $ CA', type: 'bool' },
    { name: 'tpsRate', label: 'Taux TPS (%)', type: 'number' }, { name: 'tvqRate', label: 'Taux TVQ (%)', type: 'number' },
    { name: 'modalites', label: 'Modalités de paiement', type: 'textarea' },
  ] },
  relances: { title: 'Relances automatiques', fields: [
    { name: 'avant30', label: '30 jours avant l’échéance', type: 'bool' }, { name: 'avant7', label: '7 jours avant', type: 'bool' },
    { name: 'apres1', label: '1 jour après', type: 'bool' }, { name: 'apres7', label: '7 jours après', type: 'bool' },
    { name: 'apres15', label: '15 jours après', type: 'bool' }, { name: 'apres30', label: '30 jours après', type: 'bool' },
    { name: 'notif', label: 'Par notification', type: 'bool' }, { name: 'courriel', label: 'Par courriel', type: 'bool' },
    { name: 'autoRetard', label: 'Passer en retard automatiquement à l’échéance', type: 'bool' },
  ] },
  saas: { title: 'Abonnement à la plateforme', fields: [
    { name: 'plan', label: 'Formule' }, { name: 'base', label: 'Prix de base ($ CA / mois)', type: 'number' },
    { name: 'parUser', label: 'Prix par utilisateur ($ CA / mois)', type: 'number' },
    { name: 'tpsRate', label: 'TPS sur l’abonnement (%)', type: 'number' }, { name: 'tvqRate', label: 'TVQ sur l’abonnement (%)', type: 'number' },
    { name: 'prochaine', label: 'Prochaine facture', type: 'date' }, { name: 'moyen', label: 'Moyen de paiement' },
  ] },
};
