import { getCurrentUser } from "@/lib/session";
import { supportMembre } from "@/lib/support";

const SANS_CACHE = { "Cache-Control": "no-store" };

export async function GET() {
  const user = await getCurrentUser("membre");
  return Response.json(await supportMembre(user.id), { headers: SANS_CACHE });
}
