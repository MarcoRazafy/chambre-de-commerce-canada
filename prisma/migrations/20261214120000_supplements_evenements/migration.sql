-- Événements : autres paiements au choix (suppléments), et ce que chaque inscrit a choisi et doit
CREATE TABLE "supplements_evenements" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "prix" INTEGER NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "supplements_evenements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "supplements_evenements_eventId_idx" ON "supplements_evenements"("eventId");

ALTER TABLE "supplements_evenements" ADD CONSTRAINT "supplements_evenements_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attendees" ADD COLUMN "supplements" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "montant" INTEGER NOT NULL DEFAULT 0;
