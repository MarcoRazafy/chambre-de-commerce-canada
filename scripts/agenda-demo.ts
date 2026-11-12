import { avecChambre, CHAMBRE_PRINCIPALE } from "../lib/chambre-courante";
import { prisma } from "../lib/db";
import { ajouterJours } from "../lib/agenda";
import { aujourdhuiISO, jourBase } from "../lib/format";

const RAPPELS: {
  decalage: number;
  titre: string;
  heure?: string;
  note?: string;
  fait?: boolean;
}[] = [
  {
    decalage: -2,
    titre: "Envoyer le catalogue à la délégation MECC",
    heure: "10:00",
    fait: true,
  },
  {
    decalage: 0,
    titre: "Préparer le tour de table du 5 à 7",
    note: "Deux minutes : qui nous sommes, ce que nous cherchons.",
  },
  {
    decalage: 1,
    titre: "Appeler le transitaire pour le devis Montréal",
    heure: "09:30",
  },
  {
    decalage: 6,
    titre: "Relire la fiche entreprise dans l’annuaire",
    heure: "15:00",
  },
  {
    decalage: 13,
    titre: "Point export avec l’équipe commerciale",
    heure: "11:00",
    note: "Retours de la mission et suites à donner.",
  },
];

async function main() {
  const user = await prisma.user.findFirst({
    where: { role: "membre" },
    orderBy: { createdAt: "asc" },
    select: { id: true, nom: true },
  });
  if (!user) {
    console.log("  Aucun utilisateur membre : lancez d’abord le seed.");
    return prisma.$disconnect();
  }

  const deja = await prisma.rappel.count({ where: { userId: user.id } });
  if (deja > 0) {
    console.log(`  ${user.nom} a déjà ${deja} rappel(s) : rien à faire.`);
  } else {
    const aujourdhui = aujourdhuiISO();
    const { count } = await prisma.rappel.createMany({
      data: RAPPELS.map((r) => ({
        userId: user.id,
        titre: r.titre,
        note: r.note ?? null,
        heure: r.heure ?? null,
        fait: r.fait ?? false,
        jour: jourBase(ajouterJours(aujourdhui, r.decalage)),
      })),
    });
    console.log(`  ${count} rappels ajoutés à l’agenda de ${user.nom}.`);
  }
  await prisma.$disconnect();
}

avecChambre(process.env.CHAMBRE || CHAMBRE_PRINCIPALE, main);
