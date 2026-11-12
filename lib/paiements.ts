import { estCodeInscription } from "@/lib/codes-accueil";
import "server-only";
import { achatDe } from "@/lib/achat";
import { conclureAchat } from "@/lib/achats-en-ligne";
import type { Prisma } from "@/lib/generated/prisma/client";
import { delivrerBillets, delivrerBilletsPublics } from "@/lib/billets";
import { avecChambre } from "@/lib/chambre-courante";
import { estSessionStripe, etatSessionStripe } from "@/lib/encaissement-stripe";
import { prisma, prismaSysteme } from "@/lib/db";
import { jourBase } from "@/lib/format";
import { nomFacture } from "@/lib/factures";
import { fmtMontant } from "@/lib/membership";
import { MODES } from "@/lib/modes-reglement";
import {
  canalVanillaPay,
  interrogerStatut,
  type EtatPaiement,
} from "@/lib/vanillapay";

export const estCotisation = (objet: string) => /^cotisation/i.test(objet);

export type Issue =
  | "reglee"
  | "deja_reglee"
  | "echouee"
  | "montant_different"
  | "inconnue"
  | "en_cours";

// Appelé par le prestataire de paiement, sans session : la Chambre est celle du paiement
export async function conclurePaiement(
  etat: EtatPaiement,
  charge: unknown,
): Promise<Issue> {
  const ref = await prismaSysteme.paiement.findUnique({
    where: { reference: etat.reference },
    select: { chambreId: true },
  });
  if (!ref) return "inconnue";
  return avecChambre(ref.chambreId, () => conclureDansLaChambre(etat, charge));
}

async function conclureDansLaChambre(
  etat: EtatPaiement,
  charge: unknown,
): Promise<Issue> {
  const trace = charge as Prisma.InputJsonValue;

  const p = await prisma.paiement.findUnique({
    where: { reference: etat.reference },
    include: {
      invoice: {
        include: { member: { select: { id: true, nom: true, statut: true } } },
      },
      member: { select: { nom: true } },
    },
  });
  if (!p) return "inconnue";

  if (p.statut === "reussie") return "deja_reglee";

  if (etat.echoue) {
    if (p.statut !== "en_cours") return "echouee";
    await prisma.paiement.update({
      where: { id: p.id },
      data: { statut: "echouee", notification: trace },
    });
    return "echouee";
  }
  if (!etat.reussi) return "en_cours";

  if (etat.montant !== null && etat.montant !== p.montant) {
    await prisma.$transaction([
      prisma.paiement.update({
        where: { id: p.id },
        data: { statut: "echouee", notification: trace },
      }),
      prisma.auditLog.create({
        data: {
          action: "paiement_refuse",
          entite: "Invoice",
          entiteId: p.invoice?.numero ?? p.reference,
          acteur: "Vanilla Pay",
          detail: `Montant annoncé ${fmtMontant(etat.montant, p.devise)} au lieu de ${fmtMontant(p.montant, p.devise)} — règlement non enregistré.`,
        },
      }),
    ]);
    return "montant_different";
  }

  const f = p.invoice;
  const achat = f ? null : achatDe(p.detail);
  if (achat && p.memberId) {
    return conclureAchat(
      {
        id: p.id,
        montant: p.montant,
        devise: p.devise,
        mode: p.mode,
        memberId: p.memberId,
        nomMembre: p.member?.nom ?? "Membre",
      },
      achat,
      etat.transaction,
      trace,
    );
  }
  const membre = f?.member ?? null;
  const cotisation =
    membre !== null &&
    f !== null &&
    estCotisation(f.objet) &&
    membre.statut !== "a_jour";
  const montant = fmtMontant(p.montant, p.devise);
  const moyen = MODES[p.mode].titre;

  await prisma.$transaction([
    prisma.paiement.update({
      where: { id: p.id },
      data: {
        statut: "reussie",
        transaction: etat.transaction,
        notification: trace,
        regleLe: new Date(),
      },
    }),
    ...(!f || f.statut === "payee"
      ? []
      : [
          prisma.invoice.update({
            where: { id: f.id },
            data: { statut: "payee", payeeLe: jourBase() },
          }),
        ]),
    ...(cotisation
      ? [
          prisma.member.update({
            where: { id: membre.id },
            data: {
              statut: "a_jour",
              retardDepuis: null,
              paiementNote: `Payé en ligne · ${moyen.toLowerCase()} · ${montant}`,
            },
          }),
        ]
      : []),
    prisma.auditLog.create({
      data: {
        action: "paiement_en_ligne",
        entite: "Invoice",
        entiteId: f?.numero ?? p.reference,
        acteur: membre?.nom ?? (f ? nomFacture(f) : "Inscription publique"),
        detail: `${montant} réglés en ligne (${moyen.toLowerCase()})${etat.transaction ? ` · transaction ${etat.transaction}` : ""}.`,
      },
    }),
  ]);

  if (f) {
    await delivrerBillets(f.id, "Vanilla Pay");
  } else {
    const inscription = inscriptionPublique(p.detail);
    if (inscription) {
      await delivrerBilletsPublics(
        inscription.eventId,
        inscription.code,
        "Vanilla Pay",
      );
    }
  }

  return "reglee";
}

export function inscriptionPublique(
  detail: unknown,
): { eventId: string; code: string } | null {
  if (!detail || typeof detail !== "object" || Array.isArray(detail))
    return null;
  const d = detail as Record<string, unknown>;
  return typeof d.inscription === "string" && typeof d.eventId === "string"
    ? { eventId: d.eventId, code: d.inscription }
    : null;
}

export async function reglementPublicOuvert(eventId: string, code: string) {
  if (!estCodeInscription(code)) return null;
  return prisma.paiement.findFirst({
    where: {
      invoiceId: null,
      statut: { in: ["en_cours", "annonce"] },
      AND: [
        { detail: { path: ["inscription"], equals: code } },
        { detail: { path: ["eventId"], equals: eventId } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      mode: true,
      reference: true,
      statut: true,
      montant: true,
      devise: true,
    },
  });
}

export async function reglementPublicEcarte(eventId: string, code: string) {
  if (!estCodeInscription(code)) return null;
  return prisma.paiement.findFirst({
    where: {
      invoiceId: null,
      statut: "echouee",
      annonceLe: { not: null },
      AND: [
        { detail: { path: ["inscription"], equals: code } },
        { detail: { path: ["eventId"], equals: eventId } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    select: { reference: true, mode: true },
  });
}

export async function suivrePaiementPublic(
  reference: string,
  code: string,
): Promise<"reussie" | "echouee" | "en_cours" | null> {
  const p = await prisma.paiement.findUnique({
    where: { reference },
    select: {
      statut: true,
      mode: true,
      transaction: true,
      detail: true,
      invoiceId: true,
    },
  });
  const canal = p ? canalVanillaPay(p.mode) : null;
  if (
    !p ||
    !canal ||
    p.invoiceId ||
    inscriptionPublique(p.detail)?.code !== code
  ) {
    return null;
  }
  if (p.statut === "en_cours" && p.transaction) {
    const etat = estSessionStripe(p.transaction) ? await etatSessionStripe(p.transaction) : await interrogerStatut(p.transaction, canal);
    if (etat) {
      await conclurePaiement(etat, etat);
      const apres = await prisma.paiement.findUnique({
        where: { reference },
        select: { statut: true },
      });
      if (apres) return etatSimple(apres.statut);
    }
  }
  return etatSimple(p.statut);
}

const etatSimple = (statut: string): "reussie" | "echouee" | "en_cours" =>
  statut === "reussie"
    ? "reussie"
    : statut === "echouee"
      ? "echouee"
      : "en_cours";
