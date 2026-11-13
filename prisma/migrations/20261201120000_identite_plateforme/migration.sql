-- Identité de la plateforme sur les factures de l'abonnement : nom, raison sociale, adresse, coordonnées, numéros de taxes
ALTER TABLE "reglages_plateforme"
ADD COLUMN "nom" TEXT NOT NULL DEFAULT '',
ADD COLUMN "raisonSociale" TEXT NOT NULL DEFAULT '',
ADD COLUMN "adresse" TEXT NOT NULL DEFAULT '',
ADD COLUMN "courriel" TEXT NOT NULL DEFAULT '',
ADD COLUMN "telephone" TEXT NOT NULL DEFAULT '',
ADD COLUMN "neq" TEXT NOT NULL DEFAULT '',
ADD COLUMN "numeroTps" TEXT NOT NULL DEFAULT '',
ADD COLUMN "numeroTvq" TEXT NOT NULL DEFAULT '';
