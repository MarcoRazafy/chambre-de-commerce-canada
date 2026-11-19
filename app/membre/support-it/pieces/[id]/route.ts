import { getCurrentUser } from "@/lib/session";
import { pieceSupportITMembre } from "@/lib/support-it";
import { servirPieceSupportIT } from "@/lib/support-it-fichiers";

// Pièce jointe du Support IT, pour un membre (seulement celles de sa propre conversation)
export async function GET(requete: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser("membre");
  return servirPieceSupportIT(requete, await pieceSupportITMembre((await params).id, user.id));
}
