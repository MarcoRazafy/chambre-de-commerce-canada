import { avecChambre, CHAMBRE_PRINCIPALE } from "../lib/chambre-courante";
import { prisma } from "../lib/db";
import { NEWS } from "../prisma/fixtures/news";

async function main() {
  const publiques = NEWS.filter((n) => n.public).map((n) => n.id);

  const aPublier = await prisma.news.findMany({
    where: { id: { in: publiques }, public: false },
    select: { id: true, titre: true },
  });

  if (!aPublier.length) {
    const deja = await prisma.news.count({ where: { public: true } });
    console.log(
      `  Rien à faire : ${deja} actualité${deja > 1 ? "s" : ""} déjà publiée${deja > 1 ? "s" : ""}.`,
    );
  } else {
    const { count } = await prisma.news.updateMany({
      where: { id: { in: aPublier.map((n) => n.id) } },
      data: { public: true },
    });
    console.log(`  ${count} actualités diffusées sur la page publique :`);
    for (const n of aPublier) console.log(`    · ${n.titre}`);
  }

  await prisma.$disconnect();
}

avecChambre(process.env.CHAMBRE || CHAMBRE_PRINCIPALE, main);
