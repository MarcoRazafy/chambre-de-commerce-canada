-- Adresse de la Chambre : la province (rue, ville, province, code postal, pays)
ALTER TABLE "profil_chambre" ADD COLUMN "province" TEXT NOT NULL DEFAULT '';
