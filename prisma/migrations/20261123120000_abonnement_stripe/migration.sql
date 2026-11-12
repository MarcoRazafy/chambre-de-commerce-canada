-- Plateforme multi-chambres, étape 6 : abonnement par carte (Stripe), retards et relances.
-- La carte enregistrée de chaque Chambre (jamais son numéro), le paiement et les relances de chaque facture,
-- les réglages de retard (Admin GM). Les factures déjà émises ne sont pas suivies (ni relance ni retard).

-- CreateEnum
CREATE TYPE "ActionRetard" AS ENUM ('lecture', 'blocage');

-- AlterTable
ALTER TABLE "chambres" ADD COLUMN     "carteExpire" TEXT,
ADD COLUMN     "carteFin" TEXT,
ADD COLUMN     "carteMarque" TEXT,
ADD COLUMN     "stripeCarteId" TEXT,
ADD COLUMN     "stripeClientId" TEXT;

-- AlterTable
ALTER TABLE "factures_plateforme" ADD COLUMN     "dernierEchec" TEXT,
ADD COLUMN     "dernierEchecLe" TIMESTAMP(3),
ADD COLUMN     "relances" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "stripePaiementId" TEXT,
ADD COLUMN     "suivie" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "tentatives" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "reglages_plateforme" (
    "id" TEXT NOT NULL DEFAULT 'plateforme',
    "delaiRetard" INTEGER NOT NULL DEFAULT 15,
    "relances" INTEGER[] DEFAULT ARRAY[1, 7, 14]::INTEGER[],
    "actionRetard" "ActionRetard" NOT NULL DEFAULT 'lecture',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reglages_plateforme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chambres_stripeClientId_key" ON "chambres"("stripeClientId");


-- Les factures d'avant le paiement par carte : ni relance ni retard
UPDATE "factures_plateforme" SET "suivie" = false;

-- Les réglages par défaut : relances 1, 7 et 14 jours après la facture, lecture seule après 15 jours
INSERT INTO "reglages_plateforme" ("id", "updatedAt") VALUES ('plateforme', CURRENT_TIMESTAMP) ON CONFLICT ("id") DO NOTHING;
