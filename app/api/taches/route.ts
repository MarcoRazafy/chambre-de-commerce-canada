import { timingSafeEqual } from "node:crypto";
import { prelevementsDus, relancesDues } from "@/lib/abonnement-stripe";
import { avecChambre } from "@/lib/chambre-courante";
import { prismaSysteme } from "@/lib/db";
import { assurerFactureDuMois } from "@/lib/factures-plateforme";
import { appliquerReglesTags } from "@/lib/tags-auto";
import { envoyerLettresDues } from "@/lib/newsletter";
import { envoyerRappelsDus } from "@/lib/rappels-envoi";

// Tâches régulières, pour chaque Chambre tour à tour : newsletters programmées dont l'heure est venue,
// rappels d'événements dus, facture du mois de l'abonnement à la plateforme (prélevée sur la carte enregistrée),
// relances des factures en retard, tags automatiques.
// Appelé toutes les 5 minutes par le serveur lui-même (instrumentation.ts, jeton tiré au démarrage),
// ou par une tâche planifiée externe avec le secret TACHES_SECRET.
function autorise(recu: string | null): boolean {
  if (!recu) return false;
  return [process.env.TACHES_JETON, process.env.TACHES_SECRET].some((attendu) => {
    if (!attendu) return false;
    const a = Buffer.from(attendu), b = Buffer.from(recu);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

export async function POST(req: Request) {
  if (!autorise(req.headers.get("x-taches-jeton"))) return new Response("non autorisé", { status: 401 });
  const chambres = await prismaSysteme.chambre.findMany({ select: { id: true, demarrage: true }, orderBy: { createdAt: "asc" } });
  let lettres = 0;
  const rappels = { envoyes: 0, echecs: 0 };
  for (const { id, demarrage } of chambres) {
    // Une Chambre en erreur n'empêche pas les suivantes
    try {
      await avecChambre(id, async () => {
        lettres += await envoyerLettresDues();
        const r = await envoyerRappelsDus();
        rappels.envoyes += r.envoyes;
        rappels.echecs += r.echecs;
        // Abonnement : pas tant que le démarrage de la Chambre (offre, premier paiement) n'est pas fini
        if (!demarrage) {
          await assurerFactureDuMois();
          await prelevementsDus(id);
          await relancesDues(id);
        }
        // Tags automatiques : suivent la situation des entreprises (paiements, retards…)
        await appliquerReglesTags();
      });
    } catch (e) {
      console.error(`[taches] Chambre ${id}`, e);
    }
  }
  return Response.json({ lettres, rappels }, { headers: { "Cache-Control": "no-store" } });
}
