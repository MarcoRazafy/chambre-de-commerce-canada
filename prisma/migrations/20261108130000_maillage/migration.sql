-- Maillage (repris de la plateforme L’Alliée Virtuelle) : questionnaire, mises en relation, étiquettes propose / recherche / intérêts

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "besoins_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "etiquettes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "interets_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "offres_tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "maillage" (
    "memberId" TEXT NOT NULL,
    "reponses" JSONB NOT NULL DEFAULT '{}',
    "rempliPar" TEXT,
    "commenceLe" TIMESTAMP(3),
    "completeLe" TIMESTAMP(3),
    "relanceLe" TIMESTAMP(3),
    "majLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maillage_pkey" PRIMARY KEY ("memberId")
);

-- CreateTable
CREATE TABLE "mises_en_relation" (
    "id" TEXT NOT NULL,
    "memberAId" TEXT NOT NULL,
    "memberBId" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'relation',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mises_en_relation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mises_en_relation_memberAId_memberBId_key" ON "mises_en_relation"("memberAId", "memberBId");

-- AddForeignKey
ALTER TABLE "maillage" ADD CONSTRAINT "maillage_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mises_en_relation" ADD CONSTRAINT "mises_en_relation_memberAId_fkey" FOREIGN KEY ("memberAId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mises_en_relation" ADD CONSTRAINT "mises_en_relation_memberBId_fkey" FOREIGN KEY ("memberBId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

