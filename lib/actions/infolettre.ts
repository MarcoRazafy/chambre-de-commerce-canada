"use server";

import { after } from "next/server";
import { prisma } from "@/lib/db";
import { minutes, origineAppelante, tentative } from "@/lib/limite";
import { inscrireContact } from "@/lib/systeme-io";
import { chambreCourante } from "@/lib/chambre-courante";

const PAR_HEURE = 10;

const ADRESSE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ReponseInfolettre =
  | { ok: true; message: string }
  | { ok: false; erreur: string; champ?: "prenom" | "email" };

const propre = (v: unknown, max: number) =>
  String(v ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

export async function inscrireInfolettre(saisie: {
  prenom?: string;
  email?: string;
}): Promise<ReponseInfolettre> {
  const attente = tentative(
    `infolettre:${await origineAppelante()}`,
    PAR_HEURE,
    60 * 60 * 1000,
  );
  if (attente) {
    const m = minutes(attente);
    return {
      ok: false,
      erreur: `Trop d’essais depuis cet appareil. Réessayez dans ${m} minute${m > 1 ? "s" : ""}.`,
    };
  }

  const prenom = propre(saisie.prenom, 80);
  const email = propre(saisie.email, 120).toLowerCase();
  if (prenom.length < 2) {
    return { ok: false, erreur: "Indiquez votre prénom.", champ: "prenom" };
  }
  if (!ADRESSE.test(email)) {
    return {
      ok: false,
      erreur: "Indiquez une adresse e-mail valide.",
      champ: "email",
    };
  }

  const abonne = await prisma.abonne.upsert({
    where: { chambreId_email: { chambreId: await chambreCourante(), email } },
    update: { prenom, desabonneLe: null },
    create: { prenom, email, source: "vitrine" },
  });

  after(async () => {
    if (await inscrireContact({ prenom, email })) {
      await prisma.abonne.update({
        where: { id: abonne.id },
        data: { synchroniseLe: new Date() },
      });
    }
  });

  await prisma.auditLog.create({
    data: {
      action: "abonne_infolettre",
      entite: "Abonne",
      entiteId: abonne.id,
      acteur: prenom,
      detail: `Inscription à la lettre d’information depuis la page publique · ${email}.`,
    },
  });

  return {
    ok: true,
    message: "Merci, votre inscription a bien été prise en compte !",
  };
}
