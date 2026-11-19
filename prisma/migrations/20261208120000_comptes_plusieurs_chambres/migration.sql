-- DropIndex
DROP INDEX "users_email_key";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "personne" TEXT;

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_personne_idx" ON "users"("personne");

-- CreateIndex
CREATE UNIQUE INDEX "users_chambreId_email_key" ON "users"("chambreId", "email");

