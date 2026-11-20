import "server-only";

import { prismaSysteme } from "@/lib/db";

type Tx = Parameters<Parameters<typeof prismaSysteme.$transaction>[0]>[0];

export async function effacerDans(tx: Tx, chambreId: string): Promise<void> {
  const w = { where: { chambreId } };
  await tx.rendezvous.deleteMany(w);
  await tx.typeRendezvous.deleteMany(w);
  await tx.miseEnRelation.deleteMany(w);
  await tx.paiement.deleteMany(w);
  await tx.invoice.deleteMany(w);
  await tx.coordonneesPaiement.deleteMany(w);
  await tx.messageThread.deleteMany(w);
  await tx.filSupportIT.deleteMany(w);
  await tx.news.deleteMany(w);
  await tx.resource.deleteMany(w);
  await tx.dossierRessource.deleteMany(w);
  await tx.offer.deleteMany(w);
  await tx.canchamService.deleteMany(w);
  await tx.event.deleteMany(w);
  await tx.lettre.deleteMany(w);
  await tx.abonne.deleteMany(w);
  await tx.regleTag.deleteMany(w);
  await tx.tag.deleteMany(w);
  await tx.user.deleteMany(w);
  await tx.member.deleteMany(w);
  await tx.formuleAdhesion.deleteMany(w);
  await tx.facturePlateforme.deleteMany(w);
  await tx.auditLog.deleteMany(w);
  await tx.profilChambre.deleteMany(w);
  await tx.chambre.delete({ where: { id: chambreId } });
}

export function effacerChambre(chambreId: string): Promise<void> {
  return prismaSysteme.$transaction((tx) => effacerDans(tx, chambreId), { timeout: 60_000, maxWait: 10_000 });
}
