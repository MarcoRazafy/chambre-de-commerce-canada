import { invitationIcs } from "@/lib/ics";
import { libelleLieu } from "@/lib/rendezvous";
import { instantDans } from "@/lib/fuseau";
import { getFuseau } from "@/lib/fuseau-chambre";
import { getRendezvous } from "@/lib/rendezvous-donnees";
import { getCurrentUser } from "@/lib/session";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser("membre");
  const r = await getRendezvous((await params).id);
  if (!r || r.userId !== user.id) return new Response("Rendez-vous introuvable", { status: 404 });
  const fuseau = await getFuseau();
  const ics = invitationIcs({
    uid: r.id,
    debut: new Date(instantDans(r.jour, r.debut, fuseau)),
    fin: new Date(instantDans(r.jour, r.fin, fuseau)),
    titre: r.type.titre,
    description: [r.hote ? `Avec ${r.hote.nom}` : "Avec l’équipe de la Chambre", r.motif].filter(Boolean).join("\n"),
    lieu: r.lienVisio ?? libelleLieu(r.lieu).libelle,
    url: r.lienVisio,
    annule: r.annule,
  });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="rendez-vous-cancham.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
