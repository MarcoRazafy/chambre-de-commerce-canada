-- Plateforme multi-chambres, étape 3 : chaque Chambre a son adresse (sous-domaine), et peut avoir son domaine propre.

-- AlterTable
ALTER TABLE "chambres" ADD COLUMN     "domaine" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "chambres_domaine_key" ON "chambres"("domaine");

