-- Rappels aux membres : lettres personnalisées, après une facture impayée ou avant la fin d'adhésion
CREATE TABLE "rappels_membres" (
    "id" TEXT NOT NULL,
    "chambreId" TEXT NOT NULL DEFAULT 'principale',
    "declencheur" TEXT NOT NULL DEFAULT 'facture',
    "jours" INTEGER NOT NULL,
    "sujet" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "envoyes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rappels_membres_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rappels_membres_chambreId_idx" ON "rappels_membres"("chambreId");

ALTER TABLE "rappels_membres" ADD CONSTRAINT "rappels_membres_chambreId_fkey" FOREIGN KEY ("chambreId") REFERENCES "chambres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "members" ADD COLUMN "rappelsFin" TEXT[] DEFAULT ARRAY[]::TEXT[];
