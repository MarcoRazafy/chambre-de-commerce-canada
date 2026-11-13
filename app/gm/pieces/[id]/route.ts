import { compteGM } from "@/lib/gm";
import { pieceSupportITGM } from "@/lib/support-it";
import { servirPieceSupportIT } from "@/lib/support-it-fichiers";

// Pièce jointe du Support IT, pour l'Admin GM
export async function GET(requete: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await compteGM())) return new Response("Connexion requise.", { status: 401 });
  return servirPieceSupportIT(requete, await pieceSupportITGM((await params).id));
}
