import "server-only";

import { estCodeInscription } from "@/lib/codes-accueil";
import { after } from "next/server";
import { plageHoraire } from "@/lib/agenda";
import { envoyerCourriel, urlPublique } from "@/lib/courriel";
import { lienBillet } from "@/lib/billet-public";
import { prisma } from "@/lib/db";
import { toISODate } from "@/lib/enums";
import { fmtDate } from "@/lib/format";
import {
  courrielBilletsEvenement,
  courrielInscriptionEnAttente,
} from "@/lib/modeles-courriels";
import { notifierEquipe, notifierMembre } from "@/lib/push";

export type EvenementCourriel = {
  id: string;
  titre: string;
  date: Date;
  debut: string | null;
  fin: string | null;
  lieu: string;
};

export function quandEvenement(e: EvenementCourriel): string {
  return [fmtDate(toISODate(e.date)), plageHoraire(e.debut, e.fin)]
    .filter(Boolean)
    .join(" · ");
}

export const lignesDe = (code: string) => ({
  OR: [{ code }, { code: { startsWith: `${code}-` } }],
});

export function envoyerBillets(
  e: EvenementCourriel,
  participants: { nom: string; code: string }[],
  email: string,
  lien: string,
): void {
  after(async () =>
    envoyerCourriel(
      await courrielBilletsEvenement(email, {
        evenement: e.titre,
        quand: quandEvenement(e),
        lieu: e.lieu,
        participants,
        lien,
      }),
    ),
  );
}

export function envoyerAttente(
  e: EvenementCourriel,
  participants: { nom: string }[],
  email: string,
  lien: string,
  aRegler: string,
): void {
  after(() =>
    envoyerCourriel(
      courrielInscriptionEnAttente(email, {
        evenement: e.titre,
        quand: quandEvenement(e),
        lieu: e.lieu,
        participants,
        lien,
        aRegler,
      }),
    ),
  );
}

export async function delivrerBillets(
  factureId: string,
  acteur: string,
): Promise<boolean> {
  const f = await prisma.invoice.findUnique({
    where: { id: factureId },
    select: { numero: true, eventId: true, memberId: true, event: true },
  });
  if (!f?.eventId || !f.memberId || !f.event) return false;
  const { eventId, memberId, event } = f;

  const inscription = await prisma.registration.findUnique({
    where: { eventId_memberId: { eventId, memberId } },
    select: { code: true },
  });
  if (!inscription) return false;

  const lignes = await prisma.attendee.findMany({
    where: { eventId, statut: "a_valider", ...lignesDe(inscription.code) },
    orderBy: { createdAt: "asc" },
    select: { id: true, nom: true, code: true, email: true, entreprise: true },
  });
  if (!lignes.length) return false;
  const n = lignes.length;

  await prisma.$transaction([
    prisma.attendee.updateMany({
      where: { id: { in: lignes.map((l) => l.id) } },
      data: { statut: "confirme" },
    }),
    prisma.auditLog.create({
      data: {
        action: "inscription_validee",
        entite: "Event",
        entiteId: eventId,
        acteur,
        detail: `« ${event.titre} » · ${lignes[0].entreprise} · ${n} personne${n > 1 ? "s" : ""} · facture ${f.numero} réglée · billets envoyés.`,
      },
    }),
  ]);

  const email = lignes[0].email;
  const participants = lignes.flatMap((l) =>
    l.code ? [{ nom: l.nom, code: l.code }] : [],
  );
  const page = `/membre/evenements/${eventId}`;
  if (participants.length && email.includes("@")) {
    envoyerBillets(event, participants, email, await urlPublique(page));
  }
  after(() =>
    notifierMembre(memberId, {
      titre: `Vos billets : ${event.titre}`,
      corps: `Règlement reçu · ${n} participant${n > 1 ? "s" : ""} · billets envoyés à ${email}`,
      url: page,
    }),
  );
  return true;
}

export async function delivrerBilletsPublics(
  eventId: string,
  code: string,
  acteur: string,
  moyen = "en ligne",
): Promise<boolean> {
  if (!estCodeInscription(code)) return false;
  const [event, lignes] = await Promise.all([
    prisma.event.findUnique({ where: { id: eventId } }),
    prisma.attendee.findMany({
      where: { eventId, statut: "a_valider", ...lignesDe(code) },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        nom: true,
        code: true,
        email: true,
        entreprise: true,
      },
    }),
  ]);
  if (!event || !lignes.length) return false;
  const n = lignes.length;

  await prisma.$transaction([
    prisma.attendee.updateMany({
      where: { id: { in: lignes.map((l) => l.id) } },
      data: { statut: "confirme" },
    }),
    prisma.auditLog.create({
      data: {
        action: "inscription_validee",
        entite: "Event",
        entiteId: eventId,
        acteur,
        detail: `« ${event.titre} » · ${lignes[0].entreprise} · ${n} personne${n > 1 ? "s" : ""} · inscription publique réglée ${moyen} · billets envoyés.`,
      },
    }),
  ]);

  const email = lignes[0].email;
  const participants = lignes.flatMap((l) =>
    l.code ? [{ nom: l.nom, code: l.code }] : [],
  );
  if (participants.length && email.includes("@")) {
    envoyerBillets(
      event,
      participants,
      email,
      await lienBillet(eventId, code),
    );
  }
  after(() =>
    notifierEquipe({
      titre: `Inscription publique réglée : ${event.titre}`,
      corps: `${lignes[0].entreprise} · ${n} personne${n > 1 ? "s" : ""} · réglé ${moyen}`,
      url: `/admin/evenements/${eventId}`,
    }),
  );
  return true;
}
