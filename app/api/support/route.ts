import { getCurrentUser } from "@/lib/session";
import { supportMembre } from "@/lib/support";

const SANS_CACHE = { "Cache-Control": "no-store" };

// Bulle de l'espace membre : sa conversation avec l'équipe de la Chambre
// (l'espace admin a la sienne : Support IT, /api/support-it)
export async function GET() {
  const user = await getCurrentUser("membre");
  return Response.json(await supportMembre(user.id), { headers: SANS_CACHE });
}
