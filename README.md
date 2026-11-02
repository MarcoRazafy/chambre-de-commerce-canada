# L’Alliée Virtuelle : back-office de la CanCham (Next.js + PostgreSQL)

## Installation locale

1. Créer l'utilisateur et la base (une seule fois) :

   ```bash
   sudo -u postgres psql -c "create user cancham with password 'CHANGE_MOI'"
   sudo -u postgres psql -c "create database cancham owner cancham"
   ```

2. Copier `.env.example` vers `.env.local` et remplir `DATABASE_URL` (même mot de passe).
3. Créer ou mettre à jour les tables : `npm run db:init`. Le script peut être relancé sans risque et ne supprime aucune donnée.
4. Lancer : `npm run dev`, puis ouvrir http://localhost:3000
5. **Premier démarrage :** la page de connexion propose de créer le premier administrateur.
6. Facultatif, données de test : `npm run db:seed` (base vide) ou `npm run db:seed -- --reset` (remplace toutes les données ; les comptes qui ont un mot de passe sont conservés). Les adresses des données de test finissent par `.test` : aucun courriel ne peut partir vers une vraie personne.

## Mise en ligne

`npm start` met d'abord le schéma à jour, puis démarre le serveur. Variables à définir sur l'hébergeur :

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Connexion PostgreSQL |
| `APP_URL` | Adresse publique (liens de désabonnement) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Envoi des courriels. Sans `SMTP_HOST`, rien ne part : l'échec est visible dans « Envois programmés ». |
| `CRON_SECRET` | Facultatif : déclenchement externe des tâches (`GET /api/cron`, en-tête `Authorization: Bearer …`) |

## Tâches automatiques

Elles tournent toutes les 10 minutes dans le serveur (`instrumentation.ts` → `lib/jobs.ts`) :

- passage des factures échues en retard (et du membre, si c'est une cotisation) ;
- relances selon « Réglages de facturation » ;
- facture de renouvellement 30 jours avant la date de renouvellement ;
- rappels aux inscrits des événements (J-7, veille, 2 h avant) ;
- envoi des courriels et des lettres programmés.

Chaque envoi automatique est unique : il n'est jamais envoyé deux fois.

## Droits

- **Administrateur** : tout.
- **Manager** : tout, sauf Équipe & accès, Abonnement et Réglages.

## Organisation du code

- `db/schema.sql` : tables, suivies des mises à jour pour les bases existantes.
- `lib/resources.ts` : description des modules (colonnes, libellés, menu, filtres, droits).
- `lib/business.ts` : actions métier (accepter une adhésion, marquer une facture payée, relancer, confirmer un règlement, envoyer la lettre, mettre en relation…).
- `lib/auth.ts` + `proxy.ts` : connexion (mots de passe scrypt, sessions en base, cookie httpOnly).
- `lib/mail.ts` : envoi SMTP et file d'envoi.
- `app/api/[resource]` : API générique, `GET/POST /api/<table>` et `GET/PATCH/DELETE /api/<table>/<id>` (filtres : `?member_id=5`).
- `app/api/actions/<action>` : boutons d'action.
- Pages publiques : `/connexion`, `/inscription` (lettre d'information), `/desabonnement`.
