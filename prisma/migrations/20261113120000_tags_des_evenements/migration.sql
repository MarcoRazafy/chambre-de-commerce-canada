-- Les tags rattachés aux inscrits d'un événement rejoignent la liste des tags (ils n'y entraient qu'à la première inscription)
INSERT INTO "tags" ("id", "nom", "createdAt")
SELECT 'evt' || md5(t.nom), t.nom, NOW()
FROM (SELECT DISTINCT unnest("etiquettes") AS nom FROM "events") t
WHERE t.nom <> ''
ON CONFLICT ("nom") DO NOTHING;
