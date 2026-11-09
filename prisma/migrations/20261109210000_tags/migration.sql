-- Les tags existent à part : on peut en créer un avant de le poser sur des contacts
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tags_nom_key" ON "tags"("nom");

-- Les tags déjà posés sur des contacts
INSERT INTO "tags" ("id", "nom")
SELECT 'tag_' || md5(t.nom), t.nom
FROM (SELECT DISTINCT unnest("etiquettes") AS nom FROM "users") t
WHERE t.nom <> ''
ON CONFLICT ("nom") DO NOTHING;
