-- AlterEnum
ALTER TYPE "ModeReglement" ADD VALUE 'paypal';

-- AlterTable
ALTER TABLE "coordonnees_paiement" ADD COLUMN     "paypal" TEXT NOT NULL DEFAULT '';

