// Support IT, côté Chambre (bulle de l'espace admin) : la conversation avec l'Admin GM, l'envoi d'un message
// (texte, photos, vidéos, PDF) et sa lecture. Route d'API plutôt qu'action serveur : elle reste ouverte quand
// l'espace est en lecture seule ou suspendu (pour joindre le support).
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { ecrireSupportITChambre, lireSupportITChambre, supportITChambre } from "@/lib/support-it";

const SANS_CACHE = { "Cache-Control": "no-store" };

// Envoi depuis une autre adresse : refusé (le cookie de session est « lax », on vérifie aussi l'origine)
function memeOrigine(requete: NextRequest): boolean {
  const origine = requete.headers.get("origin");
  if (!origine) return true;
  const hote = requete.headers.get("x-forwarded-host") ?? requete.headers.get("host");
  try {
    return new URL(origine).host === hote;
  } catch {
    return false;
  }
}

export async function GET() {
  const user = await getCurrentUser("admin");
  return Response.json(await supportITChambre(user.id), { headers: SANS_CACHE });
}

export async function POST(requete: NextRequest) {
  if (!memeOrigine(requete)) return Response.json({ ok: false, erreur: "Origine refusée." }, { status: 403 });
  const user = await getCurrentUser("admin");
  if (user.visiteGM) return Response.json({ ok: false, erreur: "Indisponible pendant une visite de l’Admin GM." }, { status: 403 });
  let formData: FormData;
  try {
    formData = await requete.formData();
  } catch {
    return Response.json({ ok: false, erreur: "Envoi illisible. Réessayez." }, { status: 400 });
  }
  const r = await ecrireSupportITChambre(user, formData);
  return Response.json(r, { status: r.ok ? 200 : 400, headers: SANS_CACHE });
}

// Lu par l'équipe de la Chambre
export async function PATCH(requete: NextRequest) {
  if (!memeOrigine(requete)) return new Response(null, { status: 403 });
  const user = await getCurrentUser("admin");
  if (!user.visiteGM) await lireSupportITChambre();
  return new Response(null, { status: 204 });
}
