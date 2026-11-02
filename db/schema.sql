-- Schéma CanCham Connect — crée les tables sans aucune donnée.
-- Rejouable : chaque objet est créé seulement s'il n'existe pas.

-- Réglages (organisation, relances, abonnement plateforme) : une ligne par clé
create table if not exists settings (
  cle    text primary key check (cle in ('org', 'relances', 'saas')),
  valeur jsonb not null default '{}'
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

create table if not exists dossiers (
  id          serial primary key,
  nom         text not null,
  acces       text,
  payant      boolean not null default false
);

create table if not exists fichiers (
  id         serial primary key,
  dossier_id int not null references dossiers(id) on delete cascade,
  nom        text not null,
  type       text,
  taille     int not null,
  contenu    bytea not null,
  created_at timestamptz not null default now()
);

create table if not exists services (
  id          serial primary key,
  nom         text not null,
  prix        numeric(14,2),                -- vide = inclus / sur devis
  description text
);

/* ===== Communication ===== */
create table if not exists threads (
  id         serial primary key,
  member_id  int not null references members(id) on delete cascade,
  sujet      text not null,
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id         serial primary key,
  thread_id  int not null references threads(id) on delete cascade,
  de_nous    boolean not null default false,  -- true = réponse de la chambre
  texte      text not null,
  created_at timestamptz not null default now()
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
alter table dossiers drop column if exists nb_fichiers;
alter table outbox add column if not exists audience text, add column if not exists erreur text, add column if not exists ref text;
create unique index if not exists outbox_ref_key on outbox (ref);
alter table outbox drop constraint if exists outbox_statut_check;
alter table outbox add constraint outbox_statut_check check (statut in ('programmé', 'envoyé', 'annulé', 'échec'));
alter table subscribers add column if not exists jeton text not null default md5(random()::text || clock_timestamp()::text);
create unique index if not exists subscribers_jeton_key on subscribers (jeton);
alter table invoices add column if not exists objet text not null default 'autre';
alter table notifications add column if not exists lien text;
alter table team_users add column if not exists password_hash text, add column if not exists derniere_connexion timestamptz;
