import { notFound } from "next/navigation";
import { Copy } from "lucide-react";
import { EnTeteAdmin, Panneau } from "@/components/admin/ui";
import { EditeurLettre } from "@/components/newsletter/EditeurLettre";
import { Pill, Saillant } from "@/components/ui";
import { dupliquerLettre } from "@/lib/actions/newsletter";
import { prisma } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { destinataires, lireAudience } from "@/lib/newsletter";

export default async function Lettre({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const l = await prisma.lettre.findUnique({ where: { id } });
  if (!l) notFound();
  const audience = lireAudience(l.audience);
  const envoyee = l.statut === "envoyee";
  const ms = await prisma.member.findMany({ select: { etiquettes: true } });
  const etiquettes = [...new Set(ms.flatMap((m) => m.etiquettes))].sort((a, b) => a.localeCompare(b, "fr"));
  const dupliquer = (
    <form action={dupliquerLettre}>
      <input type="hidden" name="id" value={l.id} />
      <button type="submit" className="btn-contour btn-contour-sm text-ink"><Copy size={14} /> Dupliquer</button>
    </form>
  );

  return (
    <>
      <EnTeteAdmin surtitre="Newsletter" titre={envoyee ? l.sujet : <>Modifier la <Saillant>lettre</Saillant></>} actions={dupliquer}>
        {envoyee ? `Envoyée le ${fmtDate(l.envoyeeLe!.toISOString().slice(0, 10))} à ${l.envoyes} destinataire${l.envoyes > 1 ? "s" : ""} sur ${l.destinataires}.` : `Brouillon de ${l.auteur}.`}
      </EnTeteAdmin>
      {envoyee ? (
        <Panneau titre="Texte envoyé" teinte="vert" action={<Pill tone="ok">Envoyée</Pill>}>
          <div className="text-[14px] leading-relaxed text-ink whitespace-pre-line max-w-[70ch]">{l.contenu}</div>
        </Panneau>
      ) : (
        <EditeurLettre lettre={l} audience={audience} etiquettes={etiquettes} nbDestinataires={(await destinataires(audience)).length} />
      )}
    </>
  );
}
