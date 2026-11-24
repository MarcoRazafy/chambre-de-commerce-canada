import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { EnTeteAdmin } from "@/components/admin/ui";
import { EditeurRappel } from "@/components/rappels/EditeurRappel";
import { Saillant } from "@/components/ui";
import { supprimerRappelMembre } from "@/lib/actions/rappels-membres";
import { prisma } from "@/lib/db";
import { estDeclencheur, libelleRappel } from "@/lib/rappels-membres-base";

export default async function ModifierRappel({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await prisma.rappelMembre.findUnique({ where: { id } });
  if (!r) notFound();
  return (
    <>
      <EnTeteAdmin
        surtitre="Rappels"
        titre={<>Modifier le <Saillant>rappel</Saillant></>}
        actions={
          <form action={supprimerRappelMembre}>
            <input type="hidden" name="id" value={r.id} />
            <button type="submit" className="btn-contour btn-contour-sm text-bad"><Trash2 size={14} /> Supprimer</button>
          </form>
        }
      >
        {libelleRappel(r)} · {r.envoyes} envoyé{r.envoyes > 1 ? "s" : ""}
      </EnTeteAdmin>
      <EditeurRappel rappel={{ id: r.id, declencheur: estDeclencheur(r.declencheur) ? r.declencheur : "facture", jours: r.jours, sujet: r.sujet, contenu: r.contenu, actif: r.actif }} />
    </>
  );
}
