-- Support IT : conversation de l'équipe de chaque Chambre avec l'Admin GM (messages, photos, vidéos, PDF)
-- CreateTable
CREATE TABLE "fils_support_it" (
    "id" TEXT NOT NULL,
    "chambreId" TEXT NOT NULL,
    "luChambreLe" TIMESTAMP(3),
    "luGMLe" TIMESTAMP(3),
    "dernierLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fils_support_it_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages_support_it" (
    "id" TEXT NOT NULL,
    "filId" TEXT NOT NULL,
    "deGM" BOOLEAN NOT NULL DEFAULT false,
    "auteur" TEXT NOT NULL,
    "userId" TEXT,
    "texte" TEXT NOT NULL,
    "envoyeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_support_it_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pieces_support_it" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" "TypePieceJointe" NOT NULL,
    "fichier" TEXT NOT NULL,
    "taille" INTEGER NOT NULL,
    "messageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pieces_support_it_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fils_support_it_chambreId_key" ON "fils_support_it"("chambreId");

-- CreateIndex
CREATE INDEX "messages_support_it_filId_envoyeLe_idx" ON "messages_support_it"("filId", "envoyeLe");

-- CreateIndex
CREATE INDEX "pieces_support_it_messageId_idx" ON "pieces_support_it"("messageId");

-- AddForeignKey
ALTER TABLE "fils_support_it" ADD CONSTRAINT "fils_support_it_chambreId_fkey" FOREIGN KEY ("chambreId") REFERENCES "chambres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages_support_it" ADD CONSTRAINT "messages_support_it_filId_fkey" FOREIGN KEY ("filId") REFERENCES "fils_support_it"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pieces_support_it" ADD CONSTRAINT "pieces_support_it_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages_support_it"("id") ON DELETE CASCADE ON UPDATE CASCADE;

