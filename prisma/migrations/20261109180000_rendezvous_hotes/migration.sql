-- Rendez-vous : personnes qui reçoivent (spécialité, salle de visio), types rattachés à une personne,
-- lieu, couleur, prix, confirmation par l'équipe
-- AlterTable
ALTER TABLE "rendezvous" ADD COLUMN     "confirmeLe" TIMESTAMP(3),
ADD COLUMN     "hoteId" TEXT,
ADD COLUMN     "lienVisio" TEXT,
ADD COLUMN     "lieu" TEXT NOT NULL DEFAULT 'bureau',
ADD COLUMN     "statut" TEXT NOT NULL DEFAULT 'confirme';

-- AlterTable
ALTER TABLE "types_rendezvous" ADD COLUMN     "aConfirmer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "couleur" TEXT,
ADD COLUMN     "hoteId" TEXT,
ADD COLUMN     "lieu" TEXT NOT NULL DEFAULT 'bureau',
ADD COLUMN     "prix" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lienVisio" TEXT,
ADD COLUMN     "recoitRdv" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "specialite" TEXT;

-- AddForeignKey
ALTER TABLE "types_rendezvous" ADD CONSTRAINT "types_rendezvous_hoteId_fkey" FOREIGN KEY ("hoteId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rendezvous" ADD CONSTRAINT "rendezvous_hoteId_fkey" FOREIGN KEY ("hoteId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Un créneau ne se réserve qu'une fois par personne qui reçoit (et une fois pour « l'équipe ») :
-- deux personnes différentes peuvent recevoir à la même heure. Index partiel, comme avant :
-- une annulation libère l'heure, et c'est la base qui arbitre entre deux clics simultanés.
DROP INDEX IF EXISTS "rendezvous_creneau_unique";
CREATE UNIQUE INDEX "rendezvous_creneau_unique"
  ON "rendezvous" (COALESCE("hoteId", ''), "jour", "debut")
  WHERE "annuleLe" IS NULL;
