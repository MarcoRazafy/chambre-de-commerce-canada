-- Démarrage d'une Chambre créée depuis le site : choix de l'offre, paiement du premier mois, informations.
-- Les Chambres existantes n'ont pas d'étape (démarrage terminé).
CREATE TYPE "EtapeDemarrage" AS ENUM ('offre', 'paiement', 'infos');

ALTER TABLE "chambres" ADD COLUMN "demarrage" "EtapeDemarrage";
