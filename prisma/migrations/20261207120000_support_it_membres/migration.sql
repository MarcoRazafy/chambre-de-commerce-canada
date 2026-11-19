-- Support IT : en plus de la conversation de l’équipe d’une Chambre (membreId vide), une conversation par membre
ALTER TABLE "fils_support_it" ADD COLUMN "membreId" TEXT NOT NULL DEFAULT '';
DROP INDEX "fils_support_it_chambreId_key";
CREATE UNIQUE INDEX "fils_support_it_chambreId_membreId_key" ON "fils_support_it"("chambreId", "membreId");
