-- Offre à la carte (Customize) : la Chambre choisit ses fonctions, chacune à son prix mensuel
ALTER TABLE "offres_plateforme" ADD COLUMN "surMesure" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "prixFonctions" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "chambres" ADD COLUMN "fonctionsChoisies" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- L'offre Customize : un forfait de base, puis chaque fonction choisie ; l'Admin GM règle les prix
INSERT INTO "offres_plateforme" ("id", "nom", "forfait", "parUtilisateur", "utilisateursOfferts", "maxMembres", "maxUtilisateurs", "fonctions", "surMesure", "prixFonctions", "ordre", "updatedAt")
VALUES (
    'sur-mesure', 'Customize', 40, 15, 1, NULL, NULL,
    ARRAY['maillage', 'evenements', 'rendezvous', 'offres', 'ressources', 'newsletter', 'messagerie'],
    true,
    '{"maillage": 10, "evenements": 10, "rendezvous": 10, "offres": 10, "ressources": 10, "newsletter": 10, "messagerie": 10}',
    2, CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;
