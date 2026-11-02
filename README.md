# CanCham Connect — back-office (Next.js + PostgreSQL)

## Installation

1. Créer l'utilisateur et la base (une seule fois) :

   ```bash
   sudo -u postgres psql -c "create user cancham with password 'CHANGE_MOI'"
   sudo -u postgres psql -c "create database cancham owner cancham"
   ```

2. Mettre le même mot de passe dans `.env.local` (`DATABASE_URL`).
3. Créer les tables (vides) : `npm run db:init`
4. Lancer : `npm run dev`, puis ouvrir http://localhost:3000

## Organisation

- `db/schema.sql` : toutes les tables. Le script peut être relancé sans risque.
- `lib/resources.ts` : description des modules (colonnes, libellés, menu). Pour ajouter un champ, il suffit de le déclarer ici et dans le schéma : l'API et l'interface le prennent en compte.
- `app/api/[resource]` : API générique, `GET/POST /api/<table>` et `GET/PATCH/DELETE /api/<table>/<id>`.
- `app/api/messagerie` : conversations et messages.
- `app/api/suggestions` : suggestions de mise en relation entre membres.
- `app/api/settings/<org|relances|saas>` : réglages.

Pas encore d'authentification : à ajouter avant toute mise en ligne.
