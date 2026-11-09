-- Tags posés automatiquement sur les entreprises inscrites à un événement
ALTER TABLE "events" ADD COLUMN     "etiquettes" TEXT[] DEFAULT ARRAY[]::TEXT[];
