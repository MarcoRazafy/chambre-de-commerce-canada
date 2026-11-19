import { adresseEspace } from "@/lib/adresse-chambre";
import { ouvrirSession } from "@/lib/auth";
import { hoteActuel } from "@/lib/chambre-courante";
import { prismaSysteme } from "@/lib/db";
import { suiteSure } from "@/lib/google";
import { espaceDuRole } from "@/lib/hote-chambre";
import { jetonValide } from "@/lib/jetons";

const vers = (chemin: string) => new Response(null, { status: 303, headers: { Location: chemin, "Cache-Control": "no-store" } });

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const jeton = await jetonValide(sp.get("jeton") ?? undefined);
  const refus = () => vers(`/auth?${new URLSearchParams({ erreur: "Ce lien n’est plus valable : connectez-vous." })}`);
  if (!jeton || jeton.usage !== "connexion") return refus();
  const ici = await hoteActuel();
  if (ici.partage) {
    const espace = espaceDuRole(jeton.user.role);
    if (espace !== ici.partage) {
      const adresse = adresseEspace(espace);
      return adresse ? vers(`${adresse}/auth/entree?${sp}`) : refus();
    }
  } else if (jeton.user.chambreId !== ici.chambreId) {
    return refus();
  }
  const servi = await prismaSysteme.jetonCompte.updateMany({ where: { id: jeton.id, utiliseLe: null }, data: { utiliseLe: new Date() } });
  if (!servi.count) return vers("/auth");
  await ouvrirSession(jeton.user.id);
  const suite = suiteSure(sp.get("suite"));
  const sienne = (espace: string) => suite === `/${espace}` || suite.startsWith(`/${espace}/`);
  if (jeton.user.role === "admin") {
    const c = await prismaSysteme.chambre.findUnique({ where: { id: jeton.user.chambreId }, select: { demarrage: true } });
    if (!c?.demarrage) return vers(sienne("admin") ? suite : "/admin");
    const choix = new URLSearchParams();
    for (const k of ["offre", "fonctions"]) {
      const v = sp.get(k)?.slice(0, 300);
      if (v) choix.set(k, v);
    }
    return vers(`/demarrage${choix.size ? `?${choix}` : ""}`);
  }
  if (jeton.user.member?.accueilEnCours) return vers("/bienvenue");
  return vers(sienne("membre") ? suite : "/membre");
}
