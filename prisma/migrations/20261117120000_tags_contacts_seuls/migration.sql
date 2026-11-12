-- Tags sur les contacts sans entreprise
ALTER TABLE "abonnes" ADD COLUMN "etiquettes" TEXT[] DEFAULT ARRAY[]::TEXT[];
