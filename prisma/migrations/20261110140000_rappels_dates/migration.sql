-- Rappels : un titre et des dates d'envoi précises (plusieurs possibles)
-- AlterTable
ALTER TABLE "rappels_evenement" ADD COLUMN     "dates" TIMESTAMP(3)[] DEFAULT ARRAY[]::TIMESTAMP(3)[],
ADD COLUMN     "titre" TEXT,
ALTER COLUMN "avant" SET DEFAULT 0;

