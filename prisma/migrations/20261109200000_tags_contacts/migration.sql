-- Les tags passent de l'entreprise à ses contacts (les personnes)
ALTER TABLE "users" ADD COLUMN     "etiquettes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Chaque contact reçoit les tags de son entreprise : rien ne se perd
UPDATE "users" u
SET "etiquettes" = m."etiquettes"
FROM "members" m
WHERE u."memberId" = m."id" AND u."role" = 'membre' AND cardinality(m."etiquettes") > 0;

ALTER TABLE "members" DROP COLUMN "etiquettes";
