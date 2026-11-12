import { avecChambre, CHAMBRE_PRINCIPALE } from "../lib/chambre-courante";
import { prisma } from "../lib/db";
import { configPlateforme, facturePlateforme, numeroFacturePlateforme } from "../lib/plateforme";

// Données de démonstration : les factures de l'abonnement des six derniers mois, réglées.
// Ne remplace rien : une facture déjà présente (même numéro) est laissée telle quelle.
async function main() {
  const c = configPlateforme();
  const jour = String(c.jourFacturation).padStart(2, "0");
  const maintenant = new Date();
  let creees = 0;
  for (let i = 6; i >= 1; i--) {
    const d = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() - i, 1));
    const date = `${d.toISOString().slice(0, 8)}${jour}`;
    const n = Math.max(1, 6 - Math.floor(i / 2));
    const f = facturePlateforme(n, c);
    const { count } = await prisma.facturePlateforme.createMany({
      data: [{
        numero: numeroFacturePlateforme(date), date: new Date(`${date}T00:00:00Z`), forfait: f.forfait, utilisateurs: n,
        parUtilisateur: c.parUtilisateur, tauxTps: c.tps, tauxTvq: c.tvq, sousTotal: f.sousTotal, tps: f.tps, tvq: f.tvq,
        total: f.total, payeeLe: new Date(`${date}T08:00:00Z`),
      }],
      skipDuplicates: true,
    });
    creees += count;
  }
  console.log(`Factures de l'abonnement : ${creees} créée(s).`);
}

avecChambre(process.env.CHAMBRE || CHAMBRE_PRINCIPALE, main)
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
