-- Événements : rappels automatiques aux inscrits (J-7, la veille, 2 h avant), leur courriel, et les envois faits
-- AlterTable
ALTER TABLE "events" ADD COLUMN     "rappelH2" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rappelJ1" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "rappelJ7" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "rappelMessage" TEXT,
ADD COLUMN     "rappelSujet" TEXT;

-- CreateTable
CREATE TABLE "rappels_envoyes" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "envoyeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rappels_envoyes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rappels_envoyes_eventId_type_email_key" ON "rappels_envoyes"("eventId", "type", "email");

-- AddForeignKey
ALTER TABLE "rappels_envoyes" ADD CONSTRAINT "rappels_envoyes_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

