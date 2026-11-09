-- Factures mensuelles de l'abonnement de la Chambre à la plateforme
-- CreateTable
CREATE TABLE "factures_plateforme" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "forfait" DOUBLE PRECISION NOT NULL,
    "utilisateurs" INTEGER NOT NULL,
    "parUtilisateur" DOUBLE PRECISION NOT NULL,
    "tauxTps" DOUBLE PRECISION NOT NULL,
    "tauxTvq" DOUBLE PRECISION NOT NULL,
    "sousTotal" DOUBLE PRECISION NOT NULL,
    "tps" DOUBLE PRECISION NOT NULL,
    "tvq" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "payeeLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "factures_plateforme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "factures_plateforme_numero_key" ON "factures_plateforme"("numero");

