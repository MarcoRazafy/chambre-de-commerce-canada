// Entrée dans la Chambre depuis le site de la plateforme (création d'une Chambre, connexion) : le lien à usage
// unique ouvre la session à l'adresse de la Chambre, puis mène à l'espace du compte.
import { ouvrirSession } from "@/lib/auth";
import { chambreCourante } from "@/lib/chambre-courante";
import { prismaSysteme } from "@/lib/db";
import { jetonValide } from "@/lib/jetons";

const vers = (chemin: string) => new Response(null, { status: 303, headers: { Location: chemin, "Cache-Control": "no-store" } });

export async function GET(req: Request) {
  const jeton = await jetonValide(new URL(req.url).searchParams.get("jeton") ?? undefined);
  // Lien périmé, déjà servi, ou d'une autre Chambre que celle de cette adresse
  if (!jeton || jeton.usage !== "connexion" || jeton.user.chambreId !== (await chambreCourante())) {
    return vers(`/auth?${new URLSearchParams({ erreur: "Ce lien n’est plus valable : connectez-vous." })}`);
  }
  const servi = await prismaSysteme.jetonCompte.updateMany({ where: { id: jeton.id, utiliseLe: null }, data: { utiliseLe: new Date() } });
  if (!servi.count) return vers("/auth");
  await ouvrirSession(jeton.user.id);
  if (jeton.user.role === "admin") return vers("/admin");
  return vers(jeton.user.member?.accueilEnCours ? "/bienvenue" : "/membre");
}
