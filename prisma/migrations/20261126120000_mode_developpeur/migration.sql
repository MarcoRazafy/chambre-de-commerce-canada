-- Plateforme multi-chambres, étape 9 : mode développeur. Une Chambre autorise l'Admin GM à entrer dans son espace,
-- pour une durée choisie par un super admin.

-- AlterTable
ALTER TABLE "chambres" ADD COLUMN     "accesDevJusqua" TIMESTAMP(3),
ADD COLUMN     "accesDevPar" TEXT;

