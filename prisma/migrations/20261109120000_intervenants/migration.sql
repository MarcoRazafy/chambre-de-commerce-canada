-- Événements : un ou plusieurs intervenants, avec leur photo
-- CreateTable
CREATE TABLE "event_intervenants" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "fonction" TEXT,
    "entreprise" TEXT,
    "bio" TEXT,
    "photo" TEXT,
    "ordre" INTEGER NOT NULL,
    "eventId" TEXT NOT NULL,

    CONSTRAINT "event_intervenants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_intervenants_eventId_ordre_idx" ON "event_intervenants"("eventId", "ordre");

-- AddForeignKey
ALTER TABLE "event_intervenants" ADD CONSTRAINT "event_intervenants_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

