import { getCurrentUser } from "@/lib/session";
import { pieceSupportITChambre } from "@/lib/support-it";
import { servirPieceSupportIT } from "@/lib/support-it-fichiers";

export async function GET(requete: Request, { params }: { params: Promise<{ id: string }> }) {
  await getCurrentUser("admin");
  return servirPieceSupportIT(requete, await pieceSupportITChambre((await params).id));
}
