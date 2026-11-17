-- Relances automatiques des factures impayées des membres : réglées par la Chambre (vide : aucune), et celles
-- déjà envoyées pour chaque facture
ALTER TABLE "profil_chambre" ADD COLUMN "relancesMembres" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
ALTER TABLE "invoices" ADD COLUMN "relances" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
