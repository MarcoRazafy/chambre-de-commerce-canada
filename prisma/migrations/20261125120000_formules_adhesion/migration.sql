-- Plateforme multi-chambres, étape 8 : chaque Chambre règle ses formules d'adhésion et leurs prix.
-- Les 5 formules écrites jusqu'ici dans le code deviennent celles de la Chambre n° 1 (mêmes prix), et chaque
-- membre garde la sienne ; ensuite, l'ancienne liste fixe disparaît.

-- CreateTable
CREATE TABLE "formules_adhesion" (
    "id" TEXT NOT NULL,
    "chambreId" TEXT NOT NULL DEFAULT 'principale',
    "pays" TEXT NOT NULL,
    "profil" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "devise" "Devise" NOT NULL DEFAULT 'CAD',
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "formules_adhesion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "formules_adhesion_chambreId_idx" ON "formules_adhesion"("chambreId");

-- AddForeignKey
ALTER TABLE "formules_adhesion" ADD CONSTRAINT "formules_adhesion_chambreId_fkey" FOREIGN KEY ("chambreId") REFERENCES "chambres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Les formules de la Chambre n° 1, reprises du code (identifiants = les anciennes valeurs)
INSERT INTO "formules_adhesion" ("id", "chambreId", "pays", "profil", "montant", "devise", "ordre", "updatedAt") VALUES
    ('mg_consultant', 'principale', 'Madagascar', 'Consultant, groupement et ONG', 75, 'CAD', 0, CURRENT_TIMESTAMP),
    ('mg_entreprise', 'principale', 'Madagascar', 'Entreprise', 150, 'CAD', 1, CURRENT_TIMESTAMP),
    ('ca_diaspora', 'principale', 'Canada', 'Diaspora & travailleur autonome', 150, 'CAD', 2, CURRENT_TIMESTAMP),
    ('ca_entreprise', 'principale', 'Canada', 'Entreprise canadienne', 300, 'CAD', 3, CURRENT_TIMESTAMP),
    ('sur_mesure', 'principale', 'Sur mesure', 'Partenaire & sponsor', 1000, 'CAD', 4, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

-- Chaque membre de la Chambre n° 1 garde sa formule
ALTER TABLE "members" ADD COLUMN "formuleId" TEXT;
UPDATE "members" SET "formuleId" = CASE "formule"::text
    WHEN 'madagascar_consultant' THEN 'mg_consultant'
    WHEN 'madagascar_entreprise' THEN 'mg_entreprise'
    WHEN 'canada_diaspora' THEN 'ca_diaspora'
    WHEN 'canada_entreprise' THEN 'ca_entreprise'
    WHEN 'sur_mesure' THEN 'sur_mesure'
END
WHERE "formule" IS NOT NULL AND "chambreId" = 'principale';

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_formuleId_fkey" FOREIGN KEY ("formuleId") REFERENCES "formules_adhesion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- L'ancienne liste fixe
ALTER TABLE "members" DROP COLUMN "formule";
DROP TYPE "Formule";
