// Description des modules : sert à la fois à l'API (colonnes autorisées)
// et à l'interface (tableaux et formulaires).

export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'datetime' | 'bool' | 'select' | 'tags' | 'ref' | 'lignes';
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
  hint?: string;
};
export type Resource = { table: string; title: string; label: string; fields: Field[]; orderBy: string; desc?: string };

const STATUTS_MEMBRE: Opt[] = [['demande', 'Demande'], ['attente', 'En attente de paiement'], ['a_jour', 'À jour'], ['retard', 'En retard'], ['refusee', 'Refusée']];
const MOYENS = ['MVola', 'Orange Money', 'Airtel Money', 'Virement', 'Espèces', 'Carte bancaire'];
const created: Field = { name: 'created_at', label: 'Date', type: 'datetime', list: true, readonly: true };

const list: Resource[] = [
  { table: 'members', title: 'Membres', label: 'nom', orderBy: 'nom', desc: 'Les entreprises adhérentes et les demandes d’adhésion.', fields: [
    { name: 'nom', label: 'Entreprise', required: true, list: true },
    { name: 'secteur_id', label: 'Secteur', type: 'ref', ref: 'secteurs', list: true },
    { name: 'pays', label: 'Pays', type: 'select', options: [['MG', 'Madagascar'], ['CA', 'Canada']], list: true },
    { name: 'ville', label: 'Ville', list: true },
    { name: 'formule_id', label: 'Formule', type: 'ref', ref: 'formules' },
    { name: 'statut', label: 'Statut', type: 'select', options: STATUTS_MEMBRE, list: true },
    { name: 'membre_depuis', label: 'Membre depuis', type: 'date' },
    { name: 'renouvellement', label: 'Renouvellement', type: 'date', list: true },
    { name: 'acces', label: 'Accès plateforme', type: 'select', options: [['aucun', 'Aucun'], ['lien', 'Lien envoyé'], ['actif', 'Actif']] },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'besoins', label: 'Besoins', type: 'tags', hint: 'Séparés par des virgules. Sert aux suggestions IA.' },
    { name: 'offres', label: 'Produits & services proposés', type: 'tags', hint: 'Séparés par des virgules.' },
    { name: 'interets', label: 'Centres d’intérêt', type: 'tags', hint: 'Séparés par des virgules.' },
    { name: 'renouvellement_auto', label: 'Renouvellement automatique', type: 'bool' },
    { name: 'prelevement', label: 'Prélèvement autorisé', type: 'bool' },
    { name: 'moyen_paiement', label: 'Moyen de paiement enregistré' },
  ] },
  { table: 'contacts', title: 'Contacts', label: 'nom', orderBy: 'nom', desc: 'Les personnes à joindre chez chaque membre.', fields: [
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
  { table: 'events', title: 'Événements', label: 'titre', orderBy: 'date_debut desc', fields: [
    { name: 'titre', label: 'Titre', required: true, list: true },
    { name: 'date_debut', label: 'Date', type: 'datetime', required: true, list: true },
    { name: 'format', label: 'Format', type: 'select', options: ['Présentiel', 'Hybride', 'Webinaire'], list: true },
    { name: 'lieu', label: 'Lieu' },
    { name: 'capacite', label: 'Capacité', type: 'number', list: true },
    { name: 'inscrits', label: 'Inscrits', type: 'number', list: true },
    { name: 'presents', label: 'Présents', type: 'number' },
    { name: 'diffusion', label: 'Diffusion', type: 'select', options: ['Plateforme uniquement', 'Plateforme et page publique'] },
    { name: 'tarif_membre', label: 'Tarif membre (Ar)', type: 'number', hint: 'Vide = gratuit.' },
    { name: 'tarif_public', label: 'Tarif public (Ar)', type: 'number', hint: 'Vide = gratuit.' },
    { name: 'rappel_j7', label: 'Rappel 7 jours avant', type: 'bool' },
    { name: 'rappel_j1', label: 'Rappel la veille', type: 'bool' },
    { name: 'rappel_h2', label: 'Rappel 2 heures avant', type: 'bool' },
  ] },
  { table: 'agenda_rappels', title: 'Agenda', label: 'titre', orderBy: 'date_debut', desc: 'Rappels internes de l’équipe.', fields: [
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
  { table: 'dossiers', title: 'Ressources', label: 'nom', orderBy: 'nom', desc: 'Dossiers de documents partagés avec les membres.', fields: [
    { name: 'nom', label: 'Dossier', required: true, list: true },
    { name: 'nb_fichiers', label: 'Fichiers', type: 'number', list: true },
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
  { table: 'campaigns', title: 'Newsletter', label: 'titre', orderBy: 'date_envoi desc nulls first', desc: 'La lettre d’information envoyée aux adhérents et aux abonnés.', fields: [
    { name: 'titre', label: 'Lettre', required: true, list: true },
    { name: 'statut', label: 'Statut', type: 'select', options: ['Brouillon', 'Programmée', 'Envoyée'], list: true },
    { name: 'date_envoi', label: 'Envoi', type: 'datetime', list: true },
    { name: 'destinataires', label: 'Destinataires', type: 'number', list: true },
    { name: 'taux_ouverture', label: 'Ouverture (%)', type: 'number', list: true },
    { name: 'taux_clic', label: 'Clics (%)', type: 'number', list: true },
    { name: 'contenu', label: 'Contenu', type: 'textarea' },
  ] },
  { table: 'subscribers', title: 'Abonnés à la lettre', label: 'email', orderBy: 'date_inscription desc', fields: [
    { name: 'email', label: 'Courriel', required: true, list: true },
    { name: 'nom', label: 'Nom', list: true },
    { name: 'source', label: 'Source', list: true },
    { name: 'date_inscription', label: 'Inscription', type: 'date', list: true },
    { name: 'statut', label: 'Statut', type: 'select', options: ['Abonné', 'Désabonné', 'Rebond'], list: true },
  ] },
  { table: 'outbox', title: 'Envois programmés', label: 'sujet', orderBy: 'date_envoi desc nulls first', fields: [
    { name: 'type', label: 'Type', type: 'select', options: ['courriel', 'newsletter', 'notification'], list: true },
    { name: 'sujet', label: 'Sujet', required: true, list: true },
    { name: 'destinataires', label: 'Destinataires', list: true },
    { name: 'nb', label: 'Nombre', type: 'number', list: true },
    { name: 'date_envoi', label: 'Envoi', type: 'datetime', list: true },
    { name: 'statut', label: 'Statut', type: 'select', options: ['programmé', 'envoyé', 'annulé'], list: true },
    { name: 'contenu', label: 'Contenu', type: 'textarea' },
  ] },
  { table: 'invoices', title: 'Paiements & factures', label: 'numero', orderBy: 'date_emission desc, numero desc', fields: [
    { name: 'numero', label: 'Numéro', list: true, hint: 'Vide = attribué automatiquement (CC-AAAA-0001).' },
    { name: 'member_id', label: 'Membre', type: 'ref', ref: 'members', required: true, list: true },
    { name: 'lignes', label: 'Montant', type: 'lignes', list: true },
    { name: 'devise', label: 'Devise', type: 'select', options: ['MGA', 'CAD'], list: true },
    { name: 'date_emission', label: 'Émise le', type: 'date', list: true },
    { name: 'echeance', label: 'Échéance', type: 'date', list: true, hint: 'Vide = 30 jours après l’émission.' },
    { name: 'statut', label: 'Statut', type: 'select', options: [['envoyee', 'Envoyée'], ['payee', 'Payée'], ['retard', 'En retard'], ['annulee', 'Annulée']], list: true },
    { name: 'mode_paiement', label: 'Mode de paiement', type: 'select', options: MOYENS },
    { name: 'nb_relances', label: 'Relances envoyées', type: 'number' },
  ] },
  { table: 'reglements', title: 'Règlements annoncés', label: 'reference', orderBy: 'annonce_le desc', desc: 'Paiements déclarés par les membres, à confirmer.', fields: [
    { name: 'reference', label: 'Référence', required: true, list: true },
    { name: 'invoice_id', label: 'Facture', type: 'ref', ref: 'invoices', list: true },
    { name: 'moyen', label: 'Moyen', type: 'select', options: MOYENS, list: true },
    { name: 'annonce_le', label: 'Annoncé le', type: 'datetime', list: true },
    { name: 'statut', label: 'Statut', type: 'select', options: ['annoncé', 'confirmé', 'rejeté'], list: true },
  ] },
  { table: 'team_users', title: 'Équipe & accès', label: 'nom', orderBy: 'nom', fields: [
    { name: 'nom', label: 'Nom', required: true, list: true },
    { name: 'email', label: 'Courriel', required: true, list: true },
    { name: 'role', label: 'Rôle', type: 'select', options: ['Administrateur', 'Manager'], list: true },
    { name: 'fonction', label: 'Fonction', list: true },
    { name: 'actif', label: 'Actif', type: 'bool', list: true },
  ] },
  { table: 'platform_invoices', title: 'Factures de la plateforme', label: 'numero', orderBy: 'date_facture desc', fields: [
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
    { name: 'categorie', label: 'Catégorie', type: 'select', options: ['Adhésions', 'Paiements', 'Contenus', 'Événements', 'Équipe'], list: true },
    { name: 'titre', label: 'Action', required: true, list: true },
    { name: 'detail', label: 'Détail', type: 'textarea', list: true },
    { name: 'par', label: 'Par', list: true },
    created,
  ] },
];

export const RESOURCES: Record<string, Resource> = Object.fromEntries(list.map(r => [r.table, r]));

// Menu : [adresse de la page, libellé, table affichée (vide = page dédiée)]
export const NAV: [string, [slug: string, label: string, table?: string][]][] = [
  ['Pilotage', [['', 'Tableau de bord'], ['journal', 'Journal d’activité', 'journal'], ['equipe', 'Équipe & accès', 'team_users'], ['notifications', 'Notifications', 'notifications']]],
  ['Adhérents', [['membres', 'Membres', 'members'], ['contacts', 'Contacts', 'contacts'], ['annuaire', 'Annuaire & suggestions IA'], ['mises-en-relation', 'Mises en relation', 'connections']]],
  ['Programme', [['evenements', 'Événements', 'events'], ['agenda', 'Agenda', 'agenda_rappels'], ['rendez-vous', 'Rendez-vous', 'rendez_vous'], ['types-rendez-vous', 'Types de rendez-vous', 'rdv_types'], ['actualites', 'Actualités', 'news'], ['ressources', 'Ressources', 'dossiers'], ['services', 'Services CanCham', 'services']]],
  ['Communication', [['messagerie', 'Messagerie'], ['newsletter', 'Newsletter', 'campaigns'], ['lettre', 'Abonnés à la lettre', 'subscribers'], ['envois', 'Envois programmés', 'outbox']]],
  ['Finances', [['paiements', 'Paiements & factures', 'invoices'], ['reglements', 'Règlements annoncés', 'reglements'], ['facturation', 'Réglages de facturation']]],
  ['Réglages', [['formules', 'Formules d’adhésion', 'formules'], ['secteurs', 'Secteurs d’activité', 'secteurs'], ['abonnement', 'Abonnement & utilisateurs']]],
];

export const PAGES: Record<string, { group: string; table: string }> = Object.fromEntries(
  NAV.flatMap(([group, items]) => items.filter(i => i[2]).map(([slug, , table]) => [slug, { group, table: table! }]))
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
    { name: 'prochaine', label: 'Prochaine facture', type: 'date' }, { name: 'moyen', label: 'Moyen de paiement' },
  ] },
};
