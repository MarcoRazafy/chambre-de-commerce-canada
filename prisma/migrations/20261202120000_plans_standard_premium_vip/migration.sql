-- Trois plans à prix fixe, toutes les fonctions incluses (le maillage est retiré de l'application) :
-- Standard 150 $ (jusqu'à 25 membres, 1 compte d'équipe), Premium 250 $ (membres illimités, 1 compte offert puis
-- 15 $), VIP 500 $ (membres illimités, 3 comptes offerts puis 15 $). Les identifiants restent : la gratuite devient
-- Standard (ses Chambres seront facturées), la payante Premium, l'offre à la carte VIP (ses Chambres passent sur
-- Premium). L'Administrateur peut tout régler ensuite dans Offres.
UPDATE "offres_plateforme" SET
    "nom" = 'Standard', "forfait" = 150, "parUtilisateur" = 0, "utilisateursOfferts" = 1,
    "maxMembres" = 25, "maxUtilisateurs" = 1,
    "fonctions" = ARRAY['evenements', 'rendezvous', 'offres', 'ressources', 'newsletter', 'messagerie'],
    "surMesure" = false, "prixFonctions" = '{}', "ordre" = 0, "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'gratuite';

UPDATE "offres_plateforme" SET
    "nom" = 'Premium', "forfait" = 250, "parUtilisateur" = 15, "utilisateursOfferts" = 1,
    "maxMembres" = NULL, "maxUtilisateurs" = NULL,
    "fonctions" = ARRAY['evenements', 'rendezvous', 'offres', 'ressources', 'newsletter', 'messagerie'],
    "surMesure" = false, "prixFonctions" = '{}', "ordre" = 1, "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'payante';

-- Les Chambres à la carte passent sur Premium avant que l'offre devienne VIP
UPDATE "chambres" SET "offreId" = 'payante' WHERE "offreId" = 'sur-mesure';

UPDATE "offres_plateforme" SET
    "nom" = 'VIP', "forfait" = 500, "parUtilisateur" = 15, "utilisateursOfferts" = 3,
    "maxMembres" = NULL, "maxUtilisateurs" = NULL,
    "fonctions" = ARRAY['evenements', 'rendezvous', 'offres', 'ressources', 'newsletter', 'messagerie'],
    "surMesure" = false, "prixFonctions" = '{}', "ordre" = 2, "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'sur-mesure';

-- Le maillage n'est plus une fonction : retiré des autres offres et des choix des Chambres
UPDATE "offres_plateforme" SET "fonctions" = array_remove("fonctions", 'maillage');
UPDATE "chambres" SET "fonctionsChoisies" = array_remove("fonctionsChoisies", 'maillage');
