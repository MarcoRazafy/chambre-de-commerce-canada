import { getCurrentUser } from "@/lib/session";
import { pieceSupportITMembre } from "@/lib/support-it";
import { servirPieceSupportIT } from "@/lib/support-it-fichiers";

export async function GET(requete: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser("membre");
  return servirPieceSupportIT(requete, await pieceSupportITMembre((await params).id, user.id));
}
