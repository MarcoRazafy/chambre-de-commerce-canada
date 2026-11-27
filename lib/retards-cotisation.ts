import "server-only";

import { prisma } from "@/lib/db";
import { getDelais } from "@/lib/delais-chambre";
import { jourDans } from "@/lib/fuseau";
import { getFuseau } from "@/lib/fuseau-chambre";

const jour = (d: Date, fuseau: string) => new Date(`${jourDans(d, fuseau)}T00:00:00Z`);

export async function constaterRetardsCotisation(maintenant = new Date()): Promise<number> {
  const [{ reglement }, fuseau] = await Promise.all([getDelais(), getFuseau()]);
  const limite = jour(new Date(maintenant.getTime() - reglement * 86_400_000), fuseau);
  const impayee = { statut: "envoyee" as const, objet: { startsWith: "Cotisation", mode: "insensitive" as const }, date: { lt: limite } };
  const membres = await prisma.member.findMany({
    where: { statut: "a_jour", factures: { some: impayee } },
    select: { id: true, factures: { where: impayee, orderBy: { date: "asc" }, take: 1, select: { numero: true } } },
  });
  for (const m of membres) {
    await prisma.$transaction([
      prisma.member.update({ where: { id: m.id }, data: { statut: "en_retard", retardDepuis: jour(maintenant, fuseau) } }),
      prisma.auditLog.create({
        data: {
          action: "cotisation_en_retard",
          entite: "Member",
          entiteId: m.id,
          acteur: "Contrôle automatique",
          detail: `Facture ${m.factures[0]?.numero ?? ""} non réglée ${reglement} jours après son émission : adhésion passée en retard.`,
        },
      }),
    ]);
  }
  return membres.length;
}
