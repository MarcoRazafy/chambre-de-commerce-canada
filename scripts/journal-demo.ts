import { avecChambre, CHAMBRE_PRINCIPALE } from "../lib/chambre-courante";
import { prisma } from "../lib/db";
import { journalDemo } from "../prisma/fixtures/journal";

async function main() {
  const deja = await prisma.auditLog.count({
    where: { action: { not: "seed" } },
  });
  if (deja > 0) {
    console.log(`  Journal déjà rempli (${deja} opérations) : rien à faire.`);
  } else {
    const { count } = await prisma.auditLog.createMany({
      data: journalDemo(new Date()),
    });
    console.log(`  ${count} opérations ajoutées au journal.`);
  }
  await prisma.$disconnect();
}

avecChambre(process.env.CHAMBRE || CHAMBRE_PRINCIPALE, main);
