-- Schéma CanCham Connect — crée les tables sans aucune donnée.
-- Rejouable : chaque objet est créé seulement s'il n'existe pas.

-- Réglages (organisation, relances, abonnement plateforme) : une ligne par clé
create table if not exists settings (
  cle    text primary key check (cle in ('org', 'relances', 'saas')),
  valeur jsonb not null default '{}'
);

/* ===== Comptes de l'équipe (créés tôt : la messagerie y fait référence) ===== */
create table if not exists team_users (
  id       serial primary key,
  nom      text not null,
  email    text not null unique,
  role     text not null default 'Manager' check (role in ('Administrateur', 'Manager')),
  fonction text,
  actif    boolean not null default true,
  password_hash      text,
  derniere_connexion timestamptz
);

create table if not exists sessions (
  id         text primary key,              -- empreinte SHA-256 du jeton du cookie
  user_id    int not null references team_users(id) on delete cascade,
  expires_at timestamptz not null
);

/* ===== Adhérents ===== */
create table if not exists secteurs (
  id  serial primary key,
  nom text not null unique
);

create table if not exists formules (
  id         serial primary key,
  nom        text not null,
  prix       numeric(14,2),                 -- vide = sur devis
  devise     char(3) not null default 'MGA' check (devise in ('MGA', 'CAD')),
  created_at timestamptz not null default now()
);

create table if not exists members (
  id                  serial primary key,
  nom                 text not null,
  secteur_id          int references secteurs(id) on delete set null,
  pays                char(2) not null default 'MG' check (pays in ('MG', 'CA')),
  ville               text,
  formule_id          int references formules(id) on delete set null,
  statut              text not null default 'demande' check (statut in ('a_jour', 'retard', 'attente', 'demande', 'refusee')),
  membre_depuis       date,
  renouvellement      date,
  acces               text not null default 'aucun' check (acces in ('actif', 'lien', 'aucun')),
  description         text,
  besoins             text[] not null default '{}',
  interets            text[] not null default '{}',
  offres              text[] not null default '{}',
  renouvellement_auto boolean not null default false,
  prelevement         boolean not null default false,
  moyen_paiement      text,
  logo_url            text,                              -- adresse d'une image (sinon logo déposé ou initiales)
  couverture_url      text,                              -- image de couverture dans l'annuaire
  created_at          timestamptz not null default now()
);

create table if not exists contacts (
  id        serial primary key,
  member_id int not null references members(id) on delete cascade,
  nom       text not null,
  fonction  text,
  email     text,
  tel       text,
  principal boolean not null default true
);

-- Mises en relation proposées par l'IA (acceptées ou ignorées)
create table if not exists connections (
  id         serial primary key,
  member_a   int not null references members(id) on delete cascade,
  member_b   int not null references members(id) on delete cascade,
  statut     text not null default 'relation' check (statut in ('relation', 'ignoree')),
  note       text,
  created_at timestamptz not null default now(),
  check (member_a <> member_b),
  unique (member_a, member_b)
);

/* ===== Programme ===== */
create table if not exists events (
  id            serial primary key,
  titre         text not null,
  date_debut    timestamptz not null,
  format        text not null default 'Présentiel' check (format in ('Présentiel', 'Hybride', 'Webinaire')),
  lieu          text,
  capacite      int,
  diffusion     text not null default 'Plateforme uniquement',
  tarif_membre  numeric(14,2),
  tarif_public  numeric(14,2),
  rappel_j7     boolean not null default false,
  rappel_j1     boolean not null default false,
  rappel_h2     boolean not null default false,
  date_fin      timestamptz,
  couverture_url text,                 -- photo de couverture (adresse)
  lien_visio    text,                  -- lien de connexion (hybride, webinaire)
  description   text,
  deroulement   text,                  -- programme : une étape par ligne, « 09:00 Accueil »
  intervenants  text,                  -- une personne par ligne, « Nom — fonction »
  created_at    timestamptz not null default now()
);

create table if not exists event_registrations (
  id         serial primary key,
  event_id   int not null references events(id) on delete cascade,
  member_id  int references members(id) on delete set null,
  nom        text not null,
  email      text,
  present    boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists agenda_rappels (
  id         serial primary key,
  titre      text not null,
  date_debut timestamptz not null,
  note       text
);

create table if not exists rdv_types (
  id             serial primary key,
  nom            text not null,
  duree_min      int not null default 30,
  note           text,
  disponibilites text[] not null default '{}'
);

create table if not exists rendez_vous (
  id         serial primary key,
  type_id    int not null references rdv_types(id) on delete cascade,
  member_id  int not null references members(id) on delete cascade,
  date_debut timestamptz not null,
  note       text
);

create table if not exists news (
  id           serial primary key,
  titre        text not null,
  categorie    text,
  date_pub     date not null default current_date,
  publie       boolean not null default false,
  contenu      text,
  likes        int not null default 0,
  commentaires int not null default 0
);

create table if not exists services (
  id          serial primary key,
  nom         text not null,
  prix        numeric(14,2),                -- vide = inclus / sur devis
  description text
);

/* ===== Communication ===== */
-- Conversations : 'membre' (boîte de support partagée par toute l'équipe), 'groupe' (titre + participants),
-- 'equipe' (direct entre deux personnes de l'équipe)
create table if not exists threads (
  id         serial primary key,
  type       text not null default 'membre' check (type in ('membre', 'groupe', 'equipe')),
  member_id  int references members(id) on delete cascade,   -- conversation avec un membre
  sujet      text not null default '',
  created_by int references team_users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Participants des groupes et conversations d'équipe : une personne de l'équipe OU un membre
create table if not exists thread_participants (
  id        serial primary key,
  thread_id int not null references threads(id) on delete cascade,
  user_id   int references team_users(id) on delete cascade,
  member_id int references members(id) on delete cascade,
  added_at  timestamptz not null default now(),
  check (num_nonnulls(user_id, member_id) = 1)
);
create unique index if not exists thread_participants_user on thread_participants (thread_id, user_id) where user_id is not null;
create unique index if not exists thread_participants_member on thread_participants (thread_id, member_id) where member_id is not null;

-- État de chaque conversation pour chaque personne de l'équipe
create table if not exists thread_state (
  thread_id    int not null references threads(id) on delete cascade,
  user_id      int not null references team_users(id) on delete cascade,
  last_read_at timestamptz,
  important    boolean not null default false,
  archived     boolean not null default false,
  primary key (thread_id, user_id)
);

create table if not exists messages (
  id               serial primary key,
  thread_id        int not null references threads(id) on delete cascade,
  de_nous          boolean not null default false,  -- true = écrit par l'équipe
  author_user_id   int references team_users(id) on delete set null,
  author_member_id int references members(id) on delete set null,   -- réponse d'un membre notée par l'équipe
  reply_to         int references messages(id) on delete set null,  -- message auquel on répond
  forwarded        boolean not null default false,                   -- message transféré d'une autre conversation
  texte            text not null default '',
  edited_at        timestamptz,
  deleted_at       timestamptz,
  created_at       timestamptz not null default now()
);

-- Réactions aux messages (une par personne et par message, comme Messenger)
create table if not exists message_reactions (
  message_id int not null references messages(id) on delete cascade,
  user_id    int not null references team_users(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table if not exists message_files (
  id         serial primary key,
  message_id int not null references messages(id) on delete cascade,
  nom        text not null,
  type       text not null,
  taille     int not null,
  contenu    bytea not null
);

-- Photos de profil (équipe) et logos (membres)
create table if not exists avatars (
  kind       text not null check (kind in ('user', 'member')),
  ref_id     int not null,
  type       text not null,
  contenu    bytea not null,
  updated_at timestamptz not null default now(),
  primary key (kind, ref_id)
);
create index if not exists messages_thread_idx on messages (thread_id, created_at);

-- File d'envoi : courriels composés à la main (programmés) et courriels automatiques (relances, rappels…)
create table if not exists outbox (
  id            serial primary key,
  type          text not null default 'courriel' check (type in ('courriel', 'newsletter', 'notification')),
  sujet         text not null,
  audience      text,                       -- groupe de destinataires, résolu à l'envoi
  destinataires text,                       -- adresses libres, séparées par des virgules
  nb            int,
  date_envoi    timestamptz,
  statut        text not null default 'programmé' check (statut in ('programmé', 'envoyé', 'annulé', 'échec')),
  contenu       text,
  erreur        text,
  ref           text unique                 -- évite d'envoyer deux fois la même relance automatique
);

create table if not exists campaigns (
  id             serial primary key,
  titre          text not null,
  statut         text not null default 'Brouillon' check (statut in ('Brouillon', 'Programmée', 'Envoyée')),
  date_envoi     timestamptz,
  destinataires  int,
  taux_ouverture numeric(5,2),
  taux_clic      numeric(5,2),
  contenu        text
);

create table if not exists subscribers (
  id               serial primary key,
  email            text not null unique,
  nom              text,
  source           text,
  date_inscription date not null default current_date,
  statut           text not null default 'Abonné' check (statut in ('Abonné', 'Désabonné', 'Rebond')),
  jeton            text not null unique default md5(random()::text || clock_timestamp()::text)  -- lien de désabonnement
);

/* ===== Finances ===== */
create sequence if not exists invoice_seq;

create table if not exists invoices (
  id            serial primary key,
  numero        text not null unique default ('CC-' || extract(year from now())::int || '-' || lpad(nextval('invoice_seq')::text, 4, '0')),
  member_id     int not null references members(id) on delete restrict,
  objet         text not null default 'autre' check (objet in ('cotisation', 'evenement', 'service', 'autre')),
  lignes        jsonb not null default '[]',  -- [{ "des": "...", "mt": 500000 }]
  devise        char(3) not null default 'MGA' check (devise in ('MGA', 'CAD')),
  date_emission date not null default current_date,
  echeance      date,
  statut        text not null default 'envoyee' check (statut in ('envoyee', 'payee', 'retard', 'annulee')),
  mode_paiement text,
  nb_relances   int not null default 0,
  historique    jsonb not null default '[]'
);

-- Échéance par défaut : 30 jours après l'émission
create or replace function invoices_echeance() returns trigger language plpgsql as $$
begin
  if new.echeance is null then new.echeance := new.date_emission + 30; end if;
  return new;
end $$;
drop trigger if exists invoices_echeance on invoices;
create trigger invoices_echeance before insert on invoices for each row execute function invoices_echeance();

create table if not exists reglements (
  id         serial primary key,
  reference  text not null,
  invoice_id int references invoices(id) on delete set null,
  moyen      text,
  annonce_le timestamptz not null default now(),
  statut     text not null default 'annoncé' check (statut in ('annoncé', 'confirmé', 'rejeté'))
);

/* ===== Plateforme ===== */
create table if not exists platform_invoices (
  id              serial primary key,
  numero          text not null unique,
  date_facture    date not null default current_date,
  nb_utilisateurs int not null default 0,
  montant         numeric(14,2)
);

create table if not exists notifications (
  id         serial primary key,
  texte      text not null,
  lien       text,                          -- page ouverte au clic (ex. /membres/12)
  lu         boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists journal (
  id         serial primary key,
  categorie  text,
  titre      text not null,
  detail     text,
  par        text,
  created_at timestamptz not null default now()
);

/* ===== Mises à jour des bases créées avec une version précédente ===== */
alter table events drop column if exists inscrits, drop column if exists presents;
alter table outbox add column if not exists audience text, add column if not exists erreur text, add column if not exists ref text;
create unique index if not exists outbox_ref_key on outbox (ref);
alter table outbox drop constraint if exists outbox_statut_check;
alter table outbox add constraint outbox_statut_check check (statut in ('programmé', 'envoyé', 'annulé', 'échec'));
alter table subscribers add column if not exists jeton text not null default md5(random()::text || clock_timestamp()::text);
create unique index if not exists subscribers_jeton_key on subscribers (jeton);
alter table invoices add column if not exists objet text not null default 'autre';
alter table notifications add column if not exists lien text;
alter table team_users add column if not exists password_hash text, add column if not exists derniere_connexion timestamptz;
alter table threads add column if not exists type text not null default 'membre', add column if not exists created_by int references team_users(id) on delete set null;
alter table threads alter column member_id drop not null;
alter table threads alter column sujet set default '';
alter table messages add column if not exists author_user_id int references team_users(id) on delete set null,
  add column if not exists author_member_id int references members(id) on delete set null,
  add column if not exists edited_at timestamptz, add column if not exists deleted_at timestamptz;
alter table messages alter column texte set default '';
alter table messages add column if not exists reply_to int references messages(id) on delete set null,
  add column if not exists forwarded boolean not null default false;
alter table members add column if not exists logo_url text, add column if not exists couverture_url text;
alter table events add column if not exists date_fin timestamptz, add column if not exists couverture_url text,
  add column if not exists lien_visio text, add column if not exists description text,
  add column if not exists deroulement text, add column if not exists intervenants text;

-- Actualités façon publication : auteur, mots-clés, photos et vidéos, réactions, commentaires (avec réponses) et leurs réactions.
-- Les mentions sont écrites dans le texte sous la forme @[Nom](user:3) ou @[Nom](member:5).
alter table news add column if not exists auteur_id int references team_users(id) on delete set null,
  add column if not exists tags text[] not null default '{}',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz;
create table if not exists news_media (
  id       serial primary key,
  news_id  int not null references news(id) on delete cascade,
  nom      text not null,
  type     text not null,
  taille   int not null,
  contenu  bytea not null,
  position int not null default 0
);
create table if not exists news_reactions (
  news_id    int not null references news(id) on delete cascade,
  user_id    int not null references team_users(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  primary key (news_id, user_id)
);
create table if not exists news_comments (
  id         serial primary key,
  news_id    int not null references news(id) on delete cascade,
  parent_id  int references news_comments(id) on delete cascade,   -- réponse à un commentaire (un seul niveau)
  user_id    int references team_users(id) on delete set null,
  texte      text not null,
  created_at timestamptz not null default now(),
  edited_at  timestamptz
);
create table if not exists news_comment_reactions (
  comment_id int not null references news_comments(id) on delete cascade,
  user_id    int not null references team_users(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
create index if not exists news_comments_news on news_comments (news_id, created_at);
create index if not exists news_media_news on news_media (news_id, position);

-- Fiche membre enrichie (reprise de l'annuaire CanCham) : accroche, site, forme juridique, recherche détaillée, cadrage de la couverture
alter table members add column if not exists activite text, add column if not exists site_web text,
  add column if not exists type_membre text, add column if not exists statut_juridique text,
  add column if not exists recherche text, add column if not exists motivation text,
  add column if not exists couverture_y int;

-- Notifications : qui est concerné (logo du membre ou photo du collègue) et icône du type d'événement
alter table notifications add column if not exists actor_kind text check (actor_kind in ('member', 'user')),
  add column if not exists actor_id int, add column if not exists icone text;
-- Anciennes notifications : le membre retrouvé à partir du lien (facture ou fiche membre)
update notifications n set actor_kind = 'member', actor_id = i.member_id
  from invoices i where n.actor_id is null and n.lien ~ '^/paiements/\d+$' and i.id = substring(n.lien from '\d+$')::int;
update notifications n set actor_kind = 'member', actor_id = m.id
  from members m where n.actor_id is null and n.lien ~ '^/membres/\d+$' and m.id = substring(n.lien from '\d+$')::int;

-- Couvertures déposées pour les membres (même table que les logos, kind = 'cover')
alter table avatars drop constraint if exists avatars_kind_check;
alter table avatars add constraint avatars_kind_check check (kind in ('user', 'member', 'cover', 'contact'));

/* ===== Gestion des membres reprise de CanCham Connect ===== */
-- Cadrage horizontal de la couverture (le vertical existe déjà : couverture_y)
alter table members add column if not exists couverture_x int;

-- Catalogue « Produits & services » de chaque membre (5 photos au plus par offre, stockées en base)
create table if not exists produits (
  id          serial primary key,
  member_id   int not null references members(id) on delete cascade,
  label       text not null,
  type        text not null default 'service' check (type in ('produit', 'service')),
  prix        text,                                   -- en clair : « 25 000 Ar le flacon », « Sur devis »
  description text,
  ordre       int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists produits_member_idx on produits (member_id, ordre);
create table if not exists produit_photos (
  id         serial primary key,
  produit_id int not null references produits(id) on delete cascade,
  nom        text not null,
  type       text not null,
  taille     int not null,
  contenu    bytea not null,
  position   int not null default 0
);
create index if not exists produit_photos_idx on produit_photos (produit_id, position);

-- Commentaires internes de l'équipe sur un membre (jamais visibles du membre)
create table if not exists member_notes (
  id         serial primary key,
  member_id  int not null references members(id) on delete cascade,
  texte      text not null,
  auteur     text not null,
  user_id    int references team_users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists member_notes_idx on member_notes (member_id, created_at desc);

-- Photos des contacts (même table que les logos et les couvertures)
alter table avatars drop constraint if exists avatars_kind_check;
alter table avatars add constraint avatars_kind_check check (kind in ('user', 'member', 'cover', 'contact'));

-- Supprimer un membre garde ses factures : elles gardent une copie du destinataire
alter table invoices add column if not exists destinataire_nom text, add column if not exists destinataire jsonb;
alter table invoices alter column member_id drop not null;
alter table invoices drop constraint if exists invoices_member_id_fkey;
alter table invoices add constraint invoices_member_id_fkey foreign key (member_id) references members(id) on delete set null;

/* ===== Bibliothèque de ressources (reprise de CanCham Connect) ===== */
-- Remplace les anciens dossiers / fichiers de démonstration
drop table if exists fichiers;
drop table if exists dossiers;
-- Fichiers de la bibliothèque (documents, vidéos, photos, couvertures, médias des pages), stockés en base.
-- Un fichier que plus rien ne référence est effacé ; un envoi jamais rattaché l'est au bout de 24 h.
create table if not exists res_medias (
  id         serial primary key,
  nom        text not null,
  type       text not null,
  taille     bigint not null,
  contenu    bytea not null,
  created_at timestamptz not null default now()
);
create table if not exists res_dossiers (
  id           serial primary key,
  parent_id    int references res_dossiers(id) on delete cascade,
  nom          text not null,
  restreint    boolean not null default false,       -- vrai : réservé aux entreprises choisies
  cover        int references res_medias(id) on delete set null,
  auteur_nom   text,
  auteur_role  text,
  auteur_bio   text,
  auteur_photo int references res_medias(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists res_dossiers_parent_idx on res_dossiers (parent_id);
create table if not exists res_ressources (
  id          serial primary key,
  dossier_id  int references res_dossiers(id) on delete set null,
  titre       text not null,
  cat         text not null default 'guide' check (cat in ('guide', 'modele', 'formation', 'rapport')),
  fmt         text not null default 'page' check (fmt in ('pdf', 'docx', 'video', 'image', 'page')),
  taille      text not null default '—',             -- étiquette : « 2,4 Mo », « 3 min de lecture »
  description text,
  type        text not null default 'gratuit' check (type in ('gratuit', 'payant')),
  prix        int not null default 0,                -- en ariary
  ordre       int not null default 0,
  fichier     int references res_medias(id) on delete set null,
  cover       int references res_medias(id) on delete set null,
  contenu     jsonb,                                 -- blocs d'une ressource « Page »
  date        date not null default current_date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists res_ressources_dossier_idx on res_ressources (dossier_id, ordre);
create table if not exists res_acces_dossiers (
  dossier_id int not null references res_dossiers(id) on delete cascade,
  member_id  int not null references members(id) on delete cascade,
  ouvert_par text,
  created_at timestamptz not null default now(),
  primary key (dossier_id, member_id)
);
-- Ressources payantes ouvertes à une entreprise (par l'équipe)
create table if not exists res_acces_ressources (
  ressource_id int not null references res_ressources(id) on delete cascade,
  member_id    int not null references members(id) on delete cascade,
  ouvert_par   text,
  created_at   timestamptz not null default now(),
  primary key (ressource_id, member_id)
);
