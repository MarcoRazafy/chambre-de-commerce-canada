-- Expéditeur : le domaine se règle d'abord, l'adresse ensuite (sur ce domaine)
ALTER TABLE "profil_chambre" ADD COLUMN "expediteurDomaine" TEXT NOT NULL DEFAULT '';

-- Le domaine d'une adresse déjà saisie est repris (sauf messagerie gratuite)
UPDATE "profil_chambre"
SET "expediteurDomaine" = lower(split_part("expediteurEmail", '@', 2))
WHERE "expediteurEmail" LIKE '%@%'
  AND lower(split_part("expediteurEmail", '@', 2)) NOT IN (
    'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.fr', 'ymail.com', 'hotmail.com', 'hotmail.fr', 'outlook.com',
    'outlook.fr', 'live.com', 'live.fr', 'msn.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com', 'gmx.com', 'gmx.fr',
    'proton.me', 'protonmail.com', 'laposte.net', 'orange.fr', 'free.fr', 'sfr.fr', 'wanadoo.fr', 'yandex.com', 'mail.ru'
  );
