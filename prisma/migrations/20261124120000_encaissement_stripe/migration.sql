-- Plateforme multi-chambres, étape 7 : chaque Chambre encaisse les cotisations de ses membres par carte sur son
-- propre compte Stripe (Stripe Connect) ; part de la plateforme réglée par l'Admin GM (0 % par défaut).

-- AlterTable
ALTER TABLE "chambres" ADD COLUMN     "stripeCompteActif" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeCompteId" TEXT,
ADD COLUMN     "stripeComptePays" TEXT;

-- AlterTable
ALTER TABLE "reglages_plateforme" ADD COLUMN     "commissionCotisations" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "chambres_stripeCompteId_key" ON "chambres"("stripeCompteId");

