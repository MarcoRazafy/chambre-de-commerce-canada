-- Plateforme multi-chambres, étape 4 : espace Admin GM.
-- Offres d'abonnement (Gratuite, Payante) réglées par l'Admin GM, offre et statut de chaque Chambre,
-- comptes de l'Admin GM (à part des comptes des Chambres).

-- CreateEnum
CREATE TYPE "StatutChambre" AS ENUM ('active', 'suspendue');

-- CreateTable
CREATE TABLE "offres_plateforme" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "forfait" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "parUtilisateur" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "utilisateursOfferts" INTEGER NOT NULL DEFAULT 1,
    "maxMembres" INTEGER,
    "maxUtilisateurs" INTEGER,
    "fonctions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offres_plateforme_pkey" PRIMARY KEY ("id")
);

-- Les deux offres. Payante : les prix d'aujourd'hui (100 $ par mois, 15 $ par compte de l'équipe, le super
-- admin offert) ; Gratuite : rien à payer, 25 membres et 1 compte d'équipe. Toutes les fonctions incluses :
-- l'Admin GM règle le reste.
INSERT INTO "offres_plateforme" ("id", "nom", "forfait", "parUtilisateur", "utilisateursOfferts", "maxMembres", "maxUtilisateurs", "fonctions", "ordre", "updatedAt")
VALUES
    ('gratuite', 'Gratuite', 0, 0, 1, 25, 1, ARRAY['maillage', 'evenements', 'rendezvous', 'offres', 'ressources', 'newsletter', 'messagerie'], 0, CURRENT_TIMESTAMP),
    ('payante', 'Payante', 100, 15, 1, NULL, NULL, ARRAY['maillage', 'evenements', 'rendezvous', 'offres', 'ressources', 'newsletter', 'messagerie'], 1, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- AlterTable
ALTER TABLE "chambres" ADD COLUMN     "offreId" TEXT NOT NULL DEFAULT 'gratuite',
ADD COLUMN     "statut" "StatutChambre" NOT NULL DEFAULT 'active',
ADD COLUMN     "suspendueLe" TIMESTAMP(3);

-- La Chambre n° 1 est déjà facturée chaque mois : offre Payante
UPDATE "chambres" SET "offreId" = 'payante' WHERE "id" = 'principale';

-- CreateTable
CREATE TABLE "comptes_gm" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasse" TEXT NOT NULL,
    "motDePasseModifieLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comptes_gm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "comptes_gm_email_key" ON "comptes_gm"("email");

-- AddForeignKey
ALTER TABLE "chambres" ADD CONSTRAINT "chambres_offreId_fkey" FOREIGN KEY ("offreId") REFERENCES "offres_plateforme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
