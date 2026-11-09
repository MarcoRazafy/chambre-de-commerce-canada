-- Rappels automatiques ajoutés un à un par l'équipe (remplacent les trois rappels fixes J-7, veille, 2 h)
-- CreateTable
CREATE TABLE "rappels_evenement" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "avant" INTEGER NOT NULL,
    "sujet" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rappels_evenement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rappels_evenement_eventId_idx" ON "rappels_evenement"("eventId");

-- AddForeignKey
ALTER TABLE "rappels_evenement" ADD CONSTRAINT "rappels_evenement_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

