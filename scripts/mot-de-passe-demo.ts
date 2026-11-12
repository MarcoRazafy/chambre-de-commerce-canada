import { avecChambre, CHAMBRE_PRINCIPALE } from "../lib/chambre-courante";
import { prisma } from "../lib/db";
import { hacher } from "../lib/mots-de-passe";

const MOT_DE_PASSE = process.env.MOT_DE_PASSE_DEMO ?? "12345678";

async function main() {
  const sansMotDePasse = await prisma.user.findMany({
    where: { motDePasse: null },
    select: { id: true, nom: true, email: true, role: true },
    orderBy: { role: "asc" },
  });

  if (!sansMotDePasse.length) {
    console.log("  Tous les comptes ont déjà un mot de passe.");
  } else {
    for (const u of sansMotDePasse) {
      await prisma.user.update({
        where: { id: u.id },
        data: { motDePasse: hacher(MOT_DE_PASSE) },
      });
    }
    console.log(
      `  ${sansMotDePasse.length} comptes · mot de passe « ${MOT_DE_PASSE} »`,
    );
    for (const u of sansMotDePasse.slice(0, 5)) {
      console.log(`    ${u.role.padEnd(8)} ${u.email}`);
    }
    if (sansMotDePasse.length > 5) console.log("    …");
  }
  await prisma.$disconnect();
}

avecChambre(process.env.CHAMBRE || CHAMBRE_PRINCIPALE, main);
