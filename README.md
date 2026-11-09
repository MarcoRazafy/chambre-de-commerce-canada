# CanCham Connect

Portail membre et back-office de la **Chambre de Commerce et de Coopération
Canada–Madagascar**, porté du prototype HTML vers Next.js.

## Démarrer

```bash
npm install
cp .env.example .env        # renseignez le mot de passe PostgreSQL
npm run db:deploy
npm run db:seed
npm run dev
```

Pour la production, voir [`DEPLOIEMENT.md`](./DEPLOIEMENT.md).

Voir **Base de données** ci-dessous pour la création du rôle et de la base.

## Les trois espaces

| URL | Espace | Compte de démonstration (après `db:seed`) |
|---|---|---|
| `/public` | Vitrine de la chambre | — |
| `/auth` | Connexion, demande d'adhésion, mot de passe oublié | — |
| `/membre` | Portail adhérent | Voninkazo Andriamampianina — Directrice Générale, Bio Sud Essences |
| `/admin` | Back-office | Ando Ratovomanana — Direction exécutive |

Chacun se connecte avec son adresse et son mot de passe ; `/` envoie chacun
dans son espace, ou à la connexion. En local, `npm run motsdepasse:demo`
donne un mot de passe aux comptes de démonstration qui n'en ont pas.

Mot de passe oublié, invitation d'un contact, accusé de réception et
validation d'une demande d'adhésion, relance de
cotisation : les e-mails partent par Brevo (SMTP). Sans identifiants SMTP, en local,
ils sont écrits dans le terminal du serveur, lien compris.

## Règle d'accès liée à la cotisation

C'est le cœur du produit : **l'accès à l'application dépend du paiement de la
cotisation**.

| Statut | Accès | Signal |
|---|---|---|
| À jour | Complet | — |
| En attente de paiement | Restreint au profil | Bandeau orange |
| En retard, moins de 30 jours | **Complet** | Bandeau rouge, compte à rebours |
| En retard, plus de 30 jours | Restreint au profil | Bandeau rouge, cadenas |

Contrairement au prototype HTML — où le contrôle vivait dans la fonction `go()`
côté navigateur, contournable depuis la console — la règle est appliquée
**côté serveur**, dans [`proxy.ts`](./proxy.ts), avant tout rendu.

Les règles elles-mêmes sont des fonctions pures dans
[`lib/membership.ts`](./lib/membership.ts) : le retard est recalculé à la volée à
partir de `retardDepuis`, jamais stocké. Aucun job nocturne n'est nécessaire.

**Pour voir l'état verrouillé** : dans `lib/data/users.ts`, remplacez
`memberId: "m1"` par `"m8"` (72 jours de retard) ou `"m4"` (en attente de
paiement).

## Structure

```
app/
├── page.tsx              Redirection vers l'espace de chacun
├── public/               Vitrine, formulaire d'adhésion, confirmation
├── membre/               8 sections, protégées par proxy.ts
└── admin/                8 sections
components/
├── ui.tsx                Primitives (Card, Pill, Btn, Stat, Banner, Table…)
├── domain.tsx            Composants métier (EventCard, MemberCard, fil…)
├── Shell.tsx             Sidebar + topbar, partagée membre/admin
└── pages/                Vues communes aux deux espaces
lib/
├── types.ts              Modèle de domaine, calqué sur le futur schéma Prisma
├── membership.ts         Règles d'adhésion
├── format.ts             Dates, montants, libellés de statut
└── data/                 Données d'exemple
```

Les vues `Actualités`, `Ressources`, `Offres CanCham` et `Messagerie` sont
**partagées** entre membre et admin, comme dans le prototype : mêmes écrans,
contrôles d'édition en plus côté admin.

## Données d'exemple

Entreprises, personnes et montants **fictifs**, chargés en base par `npm run db:seed`.

- **10 membres** : 7 à jour, 1 en attente de paiement, 1 en retard (72 jours),
  1 candidature à examiner. Dont un indépendant (personne physique).
- **9 événements** répartis avant et après la date du jour
- **8 actualités**, **8 ressources**, **7 factures**, **3 offres membres**,
  **6 services CanCham**, **4 fils de discussion**

Montants en Ariary.

## Modèle de données

Le prototype confondait l'entreprise et la personne. Ici `Member` (l'entreprise
adhérente, porteuse de la cotisation) et `User` (la personne qui se connecte)
sont **deux entités distinctes** — une entreprise pourra avoir plusieurs
utilisateurs.

Autre distinction préservée du prototype : `Offer` (promotions publiées **par**
les membres) et `CanchamService` (services proposés **par** la chambre) sont deux
notions différentes, avec deux pages différentes.

## Base de données

PostgreSQL 16, dans le **cluster système** (service `postgresql`, port 5432).
La base s'appelle `cancham_connect` et appartient au rôle `cancham`.

### Mise en place, une fois par poste

```bash
sudo -u postgres psql -c "CREATE ROLE cancham LOGIN PASSWORD 'choisis-en-un';"
sudo -u postgres createdb -O cancham cancham_connect

cp .env.example .env          # puis renseignez le mot de passe
npm run db:deploy             # applique les migrations
npm run db:seed               # charge les données d'exemple
```

### Au quotidien

```bash
npm run db:seed      # recharge les données d'exemple
npm run db:studio    # explorateur Prisma
npm run db:migrate   # nouvelle migration après modification du schéma
npm run db:deploy    # applique les migrations existantes (production)
npm run db:reset     # remet la base à zéro puis rejoue le seed
```

Le service système démarre avec la machine : il n'y a rien à lancer avant
`npm run dev`.

Le schéma est dans [`prisma/schema.prisma`](./prisma/schema.prisma), traduit
depuis `lib/types.ts`. **16 tables**, dont :

| Table | Rôle |
|---|---|
| `members` / `users` | L'entreprise adhérente et les personnes qui s'y rattachent |
| `produits` | Produits mis en avant sur la fiche membre |
| `events` / `registrations` / `attendees` | Événements, inscriptions de membres, présents à l'accueil |
| `news` / `resources` / `comments` | Contenus et leurs commentaires |
| `offers` / `cancham_services` | Promotions *des* membres / services *de* la chambre |
| `invoices` | Cotisations et facturations d'événements |
| `message_threads` / `messages` | Messagerie |
| `audit_logs` | Trace des opérations sensibles — une écriture financière ne disparaît pas silencieusement |

Deux choix de modélisation à connaître :

- **`Member` et `User` sont distincts.** Une entreprise peut avoir plusieurs
  utilisateurs ; le prototype les confondait.
- **Le nombre d'inscrits n'est pas stocké.** Il se calcule depuis `attendees`.
  De même, le retard de cotisation se déduit de `retardDepuis` — rien à
  recalculer par un job nocturne, aucune désynchronisation possible.

### Contenu après seed

10 membres · 3 utilisateurs · 30 produits · 9 événements · 3 inscriptions ·
748 participants · 8 actualités · 8 ressources · 3 commentaires · 3 offres ·
6 services · 7 factures · 4 fils · 11 messages

### Comment l'application y accède

Toutes les pages lisent la base. Trois modules assurent le passage :

| Module | Rôle |
|---|---|
| [`lib/db.ts`](./lib/db.ts) | Client Prisma partagé, mis en cache pour ne pas multiplier les pools en dev |
| [`lib/queries.ts`](./lib/queries.ts) | Les requêtes. Chacune rend le modèle de vue de `lib/types.ts`, donc les composants ignorent Prisma |
| [`lib/session.ts`](./lib/session.ts) | Résout l'utilisateur courant depuis son rôle. Seul point à réécrire quand l'authentification arrivera |

Les données d'exemple vivent désormais dans [`prisma/fixtures/`](./prisma/fixtures/),
où elles ne servent plus qu'au seed. `lib/data/` n'existe plus.

## Actions

Toutes les actions écrivent en base, par des Server Actions dans
[`lib/actions/`](./lib/actions/). Chacune redirige avec un message de
confirmation, affiché par [`components/Toast.tsx`](./components/Toast.tsx).

| Espace | Ce qui est possible |
|---|---|
| Public | Déposer une candidature — elle apparaît aussitôt dans le back-office |
| Membre | Modifier sa fiche, s'inscrire à un événement et annuler, commenter, écrire dans un fil, télécharger une ressource, imprimer son certificat |
| Admin | Valider (« Envoyer l’accès ») ou refuser une candidature, ouvrir l’accès d’un membre, encaisser un paiement, relancer, ajouter ou supprimer un membre, créer et modifier un événement, pointer les arrivées, publier actualités, offres, services et ressources |

Deux garde-fous :

- **Les opérations sensibles sont journalisées** dans `audit_logs` : paiement,
  suppression de membre, refus de candidature. Une écriture financière ne
  disparaît jamais sans trace.
- **Les boutons d'envoi se désactivent pendant le traitement**, sans quoi un
  double-clic sur « Enregistrer le paiement » créerait deux factures.

Les formulaires postent vers les actions sans dépendre de JavaScript ; seules
les modales en ont besoin pour s'ouvrir.

## Tests

```bash
npm test             # une fois
npm run test:watch   # en continu pendant le développement
```

Les règles qui ne doivent jamais casser, sans base ni navigateur : accès
selon la cotisation, dates et échéances, mots de passe et sessions,
limitation des tentatives, saisies dangereuses (liens `javascript:`, HTML
dans les e-mails), fin des événements. Voir [`tests/`](./tests/).

## Volontairement absent

- **Paiement en ligne** — V1 prévue en enregistrement manuel par l'admin

## Déploiement

Sur Railway, avec un volume pour les fichiers et Brevo pour les e-mails :
voir [`DEPLOIEMENT.md`](./DEPLOIEMENT.md).
