// Entrée de l'Admin GM dans l'espace d'une Chambre (mode développeur) : le lien signé, valable 2 minutes, ouvre
// une visite dans le compte du super admin de la Chambre, si elle autorise encore l'accès. Notée au journal.
import { ouvrirSession } from "@/lib/auth";
import { chambreCourante } from "@/lib/chambre-courante";
import { prismaSysteme as db } from "@/lib/db";
import { lireLienEntree, ouvrirVisite } from "@/lib/visite-gm";

const vers = (chemin: string) => new Response(null, { status: 303, headers: { Location: chemin, "Cache-Control": "no-store" } });
const refus = (message: string) => vers(`/auth?${new URLSearchParams({ erreur: message })}`);

export async function GET(req: Request) {
  const entree = lireLienEntree(new URL(req.url).searchParams.get("jeton"));
  const ici = await chambreCourante();
  if (!entree || entree.c !== ici) return refus("Ce lien d’entrée n’est plus valable.");
  const [chambre, compte, gm] = await Promise.all([
    db.chambre.findUnique({ where: { id: ici }, select: { accesDevJusqua: true } }),
    db.user.findFirst({ where: { id: entree.u, chambreId: ici, role: "admin", niveauEquipe: "administrateur" }, select: { id: true } }),
    db.compteGM.findUnique({ where: { id: entree.g }, select: { id: true } }),
  ]);
  if (!chambre?.accesDevJusqua || chambre.accesDevJusqua <= new Date()) return refus("Cet espace n’autorise pas l’accès de l’administrateur de la plateforme.");
  if (!compte || !gm) return refus("Ce lien d’entrée n’est plus valable.");
  await ouvrirSession(compte.id, false, true);
  await ouvrirVisite({ u: compte.id, g: gm.id, n: entree.n });
  await db.auditLog.create({
    data: { chambreId: ici, action: "visite_gm", entite: "Chambre", entiteId: ici, acteur: `${entree.n} (administrateur de la plateforme)`, detail: "Entrée de l’administrateur de la plateforme dans l’espace." },
  });
  return vers("/admin");
}
