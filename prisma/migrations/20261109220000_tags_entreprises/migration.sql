-- Les tags reviennent sur l'entreprise (représentée par son contact principal)
ALTER TABLE "members" ADD COLUMN     "etiquettes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Chaque entreprise reçoit les tags de tous ses contacts : rien ne se perd
UPDATE "members" m
SET "etiquettes" = t.tags
FROM (
  SELECT u."memberId", array_agg(DISTINCT e ORDER BY e) AS tags
  FROM "users" u, unnest(u."etiquettes") AS e
  WHERE u."memberId" IS NOT NULL AND e <> ''
  GROUP BY u."memberId"
) t
WHERE m."id" = t."memberId";

ALTER TABLE "users" DROP COLUMN "etiquettes";
