-- Tous les tarifs en dollars canadiens : la devise par défaut des factures et des paiements devient CAD
ALTER TABLE "invoices" ALTER COLUMN "devise" SET DEFAULT 'CAD';
ALTER TABLE "paiements" ALTER COLUMN "devise" SET DEFAULT 'CAD';
