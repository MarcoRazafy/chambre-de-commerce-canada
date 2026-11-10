-- Tags automatiques selon la situation de l'entreprise
-- CreateTable
CREATE TABLE "regles_tags" (
    "id" TEXT NOT NULL,
    "statut" "MemberStatus" NOT NULL,
    "tag" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regles_tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "regles_tags_statut_tag_key" ON "regles_tags"("statut", "tag");


-- Règle par défaut : les membres à jour portent le tag « Membre à jour »
INSERT INTO "regles_tags" ("id", "statut", "tag") VALUES ('regle_membre_a_jour', 'a_jour', 'Membre à jour') ON CONFLICT DO NOTHING;
INSERT INTO "tags" ("id", "nom") VALUES ('tag_membre_a_jour', 'Membre à jour') ON CONFLICT ("nom") DO NOTHING;
