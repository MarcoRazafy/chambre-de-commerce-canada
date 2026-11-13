-- Compte GM : mot de passe oublié (empreinte du lien envoyé par courriel, fin de validité)
ALTER TABLE "comptes_gm" ADD COLUMN "jetonReinitialisation" TEXT,
ADD COLUMN "jetonExpire" TIMESTAMP(3);

CREATE UNIQUE INDEX "comptes_gm_jetonReinitialisation_key" ON "comptes_gm"("jetonReinitialisation");
