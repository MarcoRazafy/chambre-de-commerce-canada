-- Plateforme multi-chambres, étape 2 : séparation des données.
-- Ce qui était unique dans toute la base l'est désormais dans chaque Chambre (deux Chambres peuvent avoir
-- chacune une facture n° FAC-2026-001, un tag « VIP », le même abonné). Une ligne de réglages par Chambre :
-- plus d'identifiant fixe (« unique »), la ligne se trouve par sa Chambre.

-- DropIndex
DROP INDEX "abonnes_email_key";

-- DropIndex
DROP INDEX "factures_plateforme_numero_key";

-- DropIndex
DROP INDEX "invoices_numero_key";

-- DropIndex
DROP INDEX "message_threads_visiteurCle_key";

-- DropIndex
DROP INDEX "regles_tags_statut_tag_key";

-- DropIndex
DROP INDEX "tags_nom_key";

-- AlterTable
ALTER TABLE "coordonnees_paiement" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "profil_chambre" ALTER COLUMN "id" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "abonnes_chambreId_email_key" ON "abonnes"("chambreId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "factures_plateforme_chambreId_numero_key" ON "factures_plateforme"("chambreId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_chambreId_numero_key" ON "invoices"("chambreId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "message_threads_chambreId_visiteurCle_key" ON "message_threads"("chambreId", "visiteurCle");

-- CreateIndex
CREATE UNIQUE INDEX "regles_tags_chambreId_statut_tag_key" ON "regles_tags"("chambreId", "statut", "tag");

-- CreateIndex
CREATE UNIQUE INDEX "tags_chambreId_nom_key" ON "tags"("chambreId", "nom");

