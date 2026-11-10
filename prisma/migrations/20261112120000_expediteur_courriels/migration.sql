-- Expéditeur des courriels, réglé dans « Mon entreprise »
ALTER TABLE "profil_chambre" ADD COLUMN "expediteurNom" TEXT NOT NULL DEFAULT '';
ALTER TABLE "profil_chambre" ADD COLUMN "expediteurEmail" TEXT NOT NULL DEFAULT '';
