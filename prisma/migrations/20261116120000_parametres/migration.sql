-- Paramètres : alertes de l'équipe, réseaux sociaux, mentions légales des courriels
ALTER TABLE "profil_chambre" ADD COLUMN "courrielEquipe" TEXT NOT NULL DEFAULT '';
ALTER TABLE "profil_chambre" ADD COLUMN "facebook" TEXT NOT NULL DEFAULT '';
ALTER TABLE "profil_chambre" ADD COLUMN "linkedin" TEXT NOT NULL DEFAULT '';
ALTER TABLE "profil_chambre" ADD COLUMN "instagram" TEXT NOT NULL DEFAULT '';
ALTER TABLE "profil_chambre" ADD COLUMN "youtube" TEXT NOT NULL DEFAULT '';
ALTER TABLE "profil_chambre" ADD COLUMN "tiktok" TEXT NOT NULL DEFAULT '';
ALTER TABLE "profil_chambre" ADD COLUMN "confidentialite" TEXT NOT NULL DEFAULT '';
ALTER TABLE "profil_chambre" ADD COLUMN "copyright" TEXT NOT NULL DEFAULT '';
