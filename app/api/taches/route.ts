import { timingSafeEqual } from "node:crypto";
import { envoyerLettresDues } from "@/lib/newsletter";
import { envoyerRappelsDus } from "@/lib/rappels-envoi";

// Tâches régulières : newsletters programmées dont l'heure est venue, puis rappels d'événements dus.
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
  const lettres = await envoyerLettresDues();
  const rappels = await envoyerRappelsDus();
  return Response.json({ lettres, rappels }, { headers: { "Cache-Control": "no-store" } });
}
