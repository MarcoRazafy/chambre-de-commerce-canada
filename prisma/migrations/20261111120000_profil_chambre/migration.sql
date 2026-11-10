-- « Mon entreprise » : profil de la Chambre et informations de facturation
-- CreateTable
CREATE TABLE "profil_chambre" (
    "id" TEXT NOT NULL DEFAULT 'unique',
    "nom" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "adresse" TEXT NOT NULL DEFAULT '',
    "telephone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "site" TEXT NOT NULL DEFAULT '',
    "logo" TEXT,
    "couverture" TEXT,
    "raisonSociale" TEXT NOT NULL DEFAULT '',
    "adresseFacturation" TEXT NOT NULL DEFAULT '',
    "neq" TEXT NOT NULL DEFAULT '',
    "tps" TEXT NOT NULL DEFAULT '',
    "tvq" TEXT NOT NULL DEFAULT '',
    "nif" TEXT NOT NULL DEFAULT '',
    "stat" TEXT NOT NULL DEFAULT '',
    "logoFacture" TEXT,
    "mentionFacture" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profil_chambre_pkey" PRIMARY KEY ("id")
);

