import { invitationIcs } from "@/lib/ics";
import { FUSEAU_CHAMBRE, libelleLieu } from "@/lib/rendezvous";
import { getRendezvous } from "@/lib/rendezvous-donnees";
import { getCurrentUser } from "@/lib/session";

// L'invitation d'agenda (.ics) d'un rendez-vous du membre connecté
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser("membre");
  const r = await getRendezvous((await params).id);
  if (!r || r.userId !== user.id) return new Response("Rendez-vous introuvable", { status: 404 });
  const ics = invitationIcs({
    uid: r.id,
    debut: new Date(`${r.jour}T${r.debut}:00${FUSEAU_CHAMBRE}`),
    fin: new Date(`${r.jour}T${r.fin}:00${FUSEAU_CHAMBRE}`),
    titre: `${r.type.titre} — CanCham`,
    description: [r.hote ? `Avec ${r.hote.nom}` : "Avec l’équipe CanCham", r.motif].filter(Boolean).join("\n"),
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
