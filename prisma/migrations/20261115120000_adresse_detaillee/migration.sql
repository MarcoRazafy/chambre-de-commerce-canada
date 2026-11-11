-- Adresse de « Mon entreprise » en champs séparés ; l'ancienne adresse d'un seul tenant passe dans la rue
ALTER TABLE "profil_chambre" ADD COLUMN "adresseRue" TEXT NOT NULL DEFAULT '';
ALTER TABLE "profil_chambre" ADD COLUMN "codePostal" TEXT NOT NULL DEFAULT '';
ALTER TABLE "profil_chambre" ADD COLUMN "ville" TEXT NOT NULL DEFAULT '';
ALTER TABLE "profil_chambre" ADD COLUMN "pays" TEXT NOT NULL DEFAULT '';
UPDATE "profil_chambre" SET "adresseRue" = "adresse" WHERE "adresse" <> '';
