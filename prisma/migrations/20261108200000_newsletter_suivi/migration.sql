-- Newsletter : envois programmés, suivi de chaque courriel (webhooks Resend), abonnés en erreur ou invités à adhérer
-- AlterTable
ALTER TABLE "abonnes" ADD COLUMN     "erreurLe" TIMESTAMP(3),
ADD COLUMN     "inviteLe" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "lettres" ADD COLUMN     "programmeeLe" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "envois_lettres" (
    "id" TEXT NOT NULL,
    "lettreId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "resendId" TEXT,
    "livreLe" TIMESTAMP(3),
    "ouvertLe" TIMESTAMP(3),
    "clicLe" TIMESTAMP(3),
    "erreurLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "envois_lettres_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "envois_lettres_resendId_key" ON "envois_lettres"("resendId");

-- CreateIndex
CREATE INDEX "envois_lettres_lettreId_idx" ON "envois_lettres"("lettreId");

-- CreateIndex
CREATE INDEX "envois_lettres_email_idx" ON "envois_lettres"("email");

-- AddForeignKey
ALTER TABLE "envois_lettres" ADD CONSTRAINT "envois_lettres_lettreId_fkey" FOREIGN KEY ("lettreId") REFERENCES "lettres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

