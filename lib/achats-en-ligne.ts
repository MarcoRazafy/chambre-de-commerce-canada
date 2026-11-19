import "server-only";
import { avertirPaiement } from "@/lib/courriels-paiement";

import { after } from "next/server";
import { objetAchat, type Achat, type TypeAchat } from "@/lib/achat";
import { payableEnLigne } from "@/lib/cotisation";
import { prisma } from "@/lib/db";
import { numeroFacture } from "@/lib/factures";
import { ecrireAEquipe } from "@/lib/fil-equipe";
import { jourBase } from "@/lib/format";
import { Prisma } from "@/lib/generated/prisma/client";
import { fmtMontant, isAccessLocked, type Devise } from "@/lib/membership";
import { MODES, type ModeReglement } from "@/lib/modes-reglement";
import { notifierEquipe, notifierMembre } from "@/lib/push";
import { dossiersInterdits, getMember } from "@/lib/queries";
import { utilisateurConnecte } from "@/lib/session";

export function achetableEnLigne(prix: number): boolean {
  return payableEnLigne(prix, "MGA");
}

export interface AchatDemande {
  type: TypeAchat;
  id: string;
  titre: string;
  prix: number;
}

export type AchatExamine =
  | { ok: true; achat: AchatDemande }
  | { ok: false; raison: string; dejaOuvert?: boolean };

export async function examinerAchat(
  type: TypeAchat,
  id: string,
): Promise<AchatExamine> {
  const refus = (raison: string): AchatExamine => ({ ok: false, raison });
  const user = await utilisateurConnecte();
  if (!user?.memberId || user.role !== "membre") {
    return refus("Cet achat est réservé aux membres.");
  }
  const membre = await getMember(user.memberId);
  if (!membre || isAccessLocked(membre)) {
    return refus("Cet achat est réservé aux membres à jour de cotisation.");
  }

  let achat: AchatDemande;
  if (type === "ressource") {
    const r = await prisma.resource.findUnique({
      where: { id },
      select: {
        id: true,
        titre: true,
        type: true,
        prix: true,
        dossierId: true,
      },
    });
    if (
      !r ||
      (r.dossierId && (await dossiersInterdits(user)).includes(r.dossierId))
    ) {
      return refus("Ressource introuvable.");
    }
    if (r.type !== "payant") return refus("Cette ressource est gratuite.");
    const ouvert = await prisma.accesRessource.count({
      where: { resourceId: r.id, memberId: user.memberId },
    });
    if (ouvert) {
      return {
        ok: false,
        raison: `« ${r.titre} » vous est déjà ouverte.`,
        dejaOuvert: true,
      };
    }
    achat = { type, id: r.id, titre: r.titre, prix: r.prix };
  } else {
    const s = await prisma.canchamService.findUnique({
      where: { id },
      select: { id: true, titre: true, type: true, prix: true },
    });
    if (!s) return refus("Ce service n’est plus proposé.");
    if (s.type !== "payant") return refus("Ce service est gratuit.");
    achat = { type, id: s.id, titre: s.titre, prix: s.prix };
  }

  if (!achetableEnLigne(achat.prix)) {
    return refus(
      "Cet achat ne se règle pas en ligne : écrivez à l’équipe CanCham.",
    );
  }
  return { ok: true, achat };
}

const ESSAIS_NUMERO = 3;

const numeroDejaPris = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

export async function conclureAchat(
  p: {
    id: string;
    montant: number;
    devise: Devise;
    mode: ModeReglement;
    memberId: string;
    nomMembre: string;
  },
  achat: Achat,
  transaction: string | null,
  trace: Prisma.InputJsonValue,
): Promise<"reglee" | "deja_reglee"> {
  const objet = objetAchat(achat);
  const montant = fmtMontant(p.montant, p.devise);
  const moyen = MODES[p.mode].titre.toLowerCase();
  const date = jourBase();

  let conclu: { factureId: string; numero: string } | null = null;
  for (let essai = 1; ; essai++) {
    const numero = await numeroFacture(date);
    try {
      conclu = await prisma.$transaction(async (tx) => {
        const { count } = await tx.paiement.updateMany({
          where: { id: p.id, statut: { not: "reussie" } },
          data: {
            statut: "reussie",
            transaction,
            notification: trace,
            regleLe: new Date(),
          },
        });
        if (!count) return null;

        const facture = await tx.invoice.create({
          data: {
            numero,
            date,
            objet,
            montant: p.montant,
            devise: p.devise,
            statut: "payee",
            payeeLe: date,
            memberId: p.memberId,
          },
          select: { id: true },
        });
        await tx.paiement.update({
          where: { id: p.id },
          data: { invoiceId: facture.id },
        });
        if (
          achat.type === "ressource" &&
          (await tx.resource.count({ where: { id: achat.id } }))
        ) {
          await tx.accesRessource.upsert({
            where: {
              resourceId_memberId: {
                resourceId: achat.id,
                memberId: p.memberId,
              },
            },
            create: {
              resourceId: achat.id,
              memberId: p.memberId,
              ouvertPar: "Achat en ligne",
            },
            update: {},
          });
        }
        await tx.auditLog.create({
          data: {
            action: "paiement_en_ligne",
            entite: "Invoice",
            entiteId: numero,
            acteur: p.nomMembre,
            detail: `${montant} réglés en ligne (${moyen}) · ${objet}${transaction ? ` · transaction ${transaction}` : ""}.`,
          },
        });
        return { factureId: facture.id, numero };
      });
      break;
    } catch (e) {
      if (!numeroDejaPris(e) || essai >= ESSAIS_NUMERO) throw e;
    }
  }
  if (!conclu) return "deja_reglee";
  const { factureId, numero } = conclu;
  await avertirPaiement({ facture: { id: factureId, numero, objet }, membreId: p.memberId, nom: p.nomMembre, eventId: null, montant, moyen: MODES[p.mode].titre });

  if (achat.type === "ressource") {
    after(() =>
      Promise.all([
        notifierMembre(p.memberId, {
          titre: "Ressource ouverte",
          corps: `« ${achat.titre} » · facture ${numero} · merci !`,
          url: `/membre/ressources/${achat.id}`,
        }),
        notifierEquipe({
          titre: "Ressource achetée en ligne",
          corps: `${p.nomMembre} · « ${achat.titre} » · ${montant}`,
          url: `/admin/paiements/${factureId}`,
        }),
      ]),
    );
    return "reglee";
  }

  const auteur = achat.par
    ? await prisma.user.findFirst({
        where: { id: achat.par, memberId: p.memberId },
        select: { id: true, nom: true },
      })
    : null;
  if (auteur) {
    await ecrireAEquipe(
      auteur,
      [
        `Paiement — ${achat.titre}`,
        `Bonjour, je viens de régler « ${achat.titre} » (${montant}) en ligne, facture ${numero}. Pouvez-vous m’indiquer la suite à donner ?`,
        [auteur.nom, p.nomMembre].filter(Boolean).join(" · "),
      ].join("\n\n"),
    );
  }
  after(() =>
    Promise.all([
      notifierMembre(p.memberId, {
        titre: "Paiement reçu",
        corps: `« ${achat.titre} » · facture ${numero} · l’équipe vous écrit pour la suite`,
        url: "/membre/messagerie",
      }),
      auteur
        ? Promise.resolve()
        : notifierEquipe({
            titre: "Service réglé en ligne",
            corps: `${p.nomMembre} · « ${achat.titre} » · ${montant}`,
            url: `/admin/paiements/${factureId}`,
          }),
    ]),
  );
  return "reglee";
}
