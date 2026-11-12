-- Plateforme multi-chambres, étape 1 : la notion de Chambre entre dans la base.
-- La Chambre n° 1 (« principale ») est créée, puis chaque table principale lui est rattachée :
-- toutes les données existantes lui appartiennent. Rien ne change pour l'application.

-- CreateTable
CREATE TABLE "chambres" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chambres_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chambres_slug_key" ON "chambres"("slug");

-- La Chambre n° 1, nommée comme la fiche « Mon entreprise » (sinon « Chambre principale »)
INSERT INTO "chambres" ("id", "slug", "nom", "updatedAt")
VALUES (
    'principale',
    'principale',
    COALESCE((SELECT NULLIF(trim("nom"), '') FROM "profil_chambre" LIMIT 1), 'Chambre principale'),
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

-- AlterTable
ALTER TABLE "abonnes" ADD COLUMN     "chambreId" TEXT NOT NULL DEFAULT 'principale';

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "chambreId" TEXT NOT NULL DEFAULT 'principale';

-- AlterTable
ALTER TABLE "cancham_services" ADD COLUMN     "chambreId" TEXT NOT NULL DEFAULT 'principale';

-- AlterTable
ALTER TABLE "coordonnees_paiement" ADD COLUMN     "chambreId" TEXT NOT NULL DEFAULT 'principale';

-- AlterTable
ALTER TABLE "dossiers_ressources" ADD COLUMN     "chambreId" TEXT NOT NULL DEFAULT 'principale';

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "chambreId" TEXT NOT NULL DEFAULT 'principale';

-- AlterTable
ALTER TABLE "factures_plateforme" ADD COLUMN     "chambreId" TEXT NOT NULL DEFAULT 'principale';

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "chambreId" TEXT NOT NULL DEFAULT 'principale';

-- AlterTable
ALTER TABLE "lettres" ADD COLUMN     "chambreId" TEXT NOT NULL DEFAULT 'principale';

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "chambreId" TEXT NOT NULL DEFAULT 'principale';

-- AlterTable
ALTER TABLE "message_threads" ADD COLUMN     "chambreId" TEXT NOT NULL DEFAULT 'principale';

-- AlterTable
ALTER TABLE "mises_en_relation" ADD COLUMN     "chambreId" TEXT NOT NULL DEFAULT 'principale';

-- AlterTable
ALTER TABLE "news" ADD COLUMN     "chambreId" TEXT NOT NULL DEFAULT 'principale';

-- AlterTable
ALTER TABLE "offers" ADD COLUMN     "chambreId" TEXT NOT NULL DEFAULT 'principale';

-- AlterTable
ALTER TABLE "paiements" ADD COLUMN     "chambreId" TEXT NOT NULL DEFAULT 'principale';

-- AlterTable
ALTER TABLE "profil_chambre" ADD COLUMN     "chambreId" TEXT NOT NULL DEFAULT 'principale';

-- AlterTable
ALTER TABLE "regles_tags" ADD COLUMN     "chambreId" TEXT NOT NULL DEFAULT 'principale';

-- AlterTable
ALTER TABLE "rendezvous" ADD COLUMN     "chambreId" TEXT NOT NULL DEFAULT 'principale';

-- AlterTable
ALTER TABLE "resources" ADD COLUMN     "chambreId" TEXT NOT NULL DEFAULT 'principale';

-- AlterTable
ALTER TABLE "tags" ADD COLUMN     "chambreId" TEXT NOT NULL DEFAULT 'principale';

-- AlterTable
ALTER TABLE "types_rendezvous" ADD COLUMN     "chambreId" TEXT NOT NULL DEFAULT 'principale';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "chambreId" TEXT NOT NULL DEFAULT 'principale';

-- CreateIndex
CREATE INDEX "abonnes_chambreId_idx" ON "abonnes"("chambreId");

-- CreateIndex
CREATE INDEX "audit_logs_chambreId_idx" ON "audit_logs"("chambreId");

-- CreateIndex
CREATE INDEX "cancham_services_chambreId_idx" ON "cancham_services"("chambreId");

-- CreateIndex
CREATE UNIQUE INDEX "coordonnees_paiement_chambreId_key" ON "coordonnees_paiement"("chambreId");

-- CreateIndex
CREATE INDEX "dossiers_ressources_chambreId_idx" ON "dossiers_ressources"("chambreId");

-- CreateIndex
CREATE INDEX "events_chambreId_idx" ON "events"("chambreId");

-- CreateIndex
CREATE INDEX "factures_plateforme_chambreId_idx" ON "factures_plateforme"("chambreId");

-- CreateIndex
CREATE INDEX "invoices_chambreId_idx" ON "invoices"("chambreId");

-- CreateIndex
CREATE INDEX "lettres_chambreId_idx" ON "lettres"("chambreId");

-- CreateIndex
CREATE INDEX "members_chambreId_idx" ON "members"("chambreId");

-- CreateIndex
CREATE INDEX "message_threads_chambreId_idx" ON "message_threads"("chambreId");

-- CreateIndex
CREATE INDEX "mises_en_relation_chambreId_idx" ON "mises_en_relation"("chambreId");

-- CreateIndex
CREATE INDEX "news_chambreId_idx" ON "news"("chambreId");

-- CreateIndex
CREATE INDEX "offers_chambreId_idx" ON "offers"("chambreId");

-- CreateIndex
CREATE INDEX "paiements_chambreId_idx" ON "paiements"("chambreId");

-- CreateIndex
CREATE UNIQUE INDEX "profil_chambre_chambreId_key" ON "profil_chambre"("chambreId");

-- CreateIndex
CREATE INDEX "regles_tags_chambreId_idx" ON "regles_tags"("chambreId");

-- CreateIndex
CREATE INDEX "rendezvous_chambreId_idx" ON "rendezvous"("chambreId");

-- CreateIndex
CREATE INDEX "resources_chambreId_idx" ON "resources"("chambreId");

-- CreateIndex
CREATE INDEX "tags_chambreId_idx" ON "tags"("chambreId");

-- CreateIndex
CREATE INDEX "types_rendezvous_chambreId_idx" ON "types_rendezvous"("chambreId");

-- CreateIndex
CREATE INDEX "users_chambreId_idx" ON "users"("chambreId");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_chambreId_fkey" FOREIGN KEY ("chambreId") REFERENCES "chambres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_chambreId_fkey" FOREIGN KEY ("chambreId") REFERENCES "chambres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_chambreId_fkey" FOREIGN KEY ("chambreId") REFERENCES "chambres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news" ADD CONSTRAINT "news_chambreId_fkey" FOREIGN KEY ("chambreId") REFERENCES "chambres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_chambreId_fkey" FOREIGN KEY ("chambreId") REFERENCES "chambres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossiers_ressources" ADD CONSTRAINT "dossiers_ressources_chambreId_fkey" FOREIGN KEY ("chambreId") REFERENCES "chambres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_chambreId_fkey" FOREIGN KEY ("chambreId") REFERENCES "chambres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancham_services" ADD CONSTRAINT "cancham_services_chambreId_fkey" FOREIGN KEY ("chambreId") REFERENCES "chambres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_chambreId_fkey" FOREIGN KEY ("chambreId") REFERENCES "chambres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_chambreId_fkey" FOREIGN KEY ("chambreId") REFERENCES "chambres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coordonnees_paiement" ADD CONSTRAINT "coordonnees_paiement_chambreId_fkey" FOREIGN KEY ("chambreId") REFERENCES "chambres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_chambreId_fkey" FOREIGN KEY ("chambreId") REFERENCES "chambres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_chambreId_fkey" FOREIGN KEY ("chambreId") REFERENCES "chambres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonnes" ADD CONSTRAINT "abonnes_chambreId_fkey" FOREIGN KEY ("chambreId") REFERENCES "chambres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "types_rendezvous" ADD CONSTRAINT "types_rendezvous_chambreId_fkey" FOREIGN KEY ("chambreId") REFERENCES "chambres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rendezvous" ADD CONSTRAINT "rendezvous_chambreId_fkey" FOREIGN KEY ("chambreId") REFERENCES "chambres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mises_en_relation" ADD CONSTRAINT "mises_en_relation_chambreId_fkey" FOREIGN KEY ("chambreId") REFERENCES "chambres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lettres" ADD CONSTRAINT "lettres_chambreId_fkey" FOREIGN KEY ("chambreId") REFERENCES "chambres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_chambreId_fkey" FOREIGN KEY ("chambreId") REFERENCES "chambres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factures_plateforme" ADD CONSTRAINT "factures_plateforme_chambreId_fkey" FOREIGN KEY ("chambreId") REFERENCES "chambres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regles_tags" ADD CONSTRAINT "regles_tags_chambreId_fkey" FOREIGN KEY ("chambreId") REFERENCES "chambres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profil_chambre" ADD CONSTRAINT "profil_chambre_chambreId_fkey" FOREIGN KEY ("chambreId") REFERENCES "chambres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
