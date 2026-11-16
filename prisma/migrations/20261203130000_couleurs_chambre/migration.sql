-- Couleurs des espaces d'une Chambre (Paramètres → Couleurs) ; vides : celles de la plateforme
ALTER TABLE "profil_chambre" ADD COLUMN "couleurPrincipale" TEXT,
ADD COLUMN "couleurLaterale" TEXT,
ADD COLUMN "couleurLaterale2" TEXT,
ADD COLUMN "couleurHaut" TEXT,
ADD COLUMN "couleurConnexion" TEXT;
